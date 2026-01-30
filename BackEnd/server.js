import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Configuration
const OPENROUTER_API_KEY = "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";
const PORT = 5001;

// Global variables
let fullPdfText = '';
let isServerReady = false;

// Load knowledge base from text file as primary source
function loadKnowledgeBaseText() {
  try {
    const possiblePaths = [
      path.resolve(process.cwd(), 'BackEnd/camtech-knowledge-base.txt'),
      path.resolve(process.cwd(), 'camtech-knowledge-base.txt')
    ];
    
    for (const textFilePath of possiblePaths) {
      if (fs.existsSync(textFilePath)) {
        const content = fs.readFileSync(textFilePath, 'utf8');
        console.log(`📚 Loaded knowledge base from: ${textFilePath} (${content.length} chars)`);
        return content;
      }
    }
    console.warn('⚠️  Knowledge base text file not found');
    return '';
  } catch (error) {
    console.error('Error loading knowledge base text:', error);
    return '';
  }
}

// Enhanced OpenRouter API call with retry logic and multiple models
async function callOpenRouterAPI(userMessage, pdfContext, retryCount = 0) {
  const maxRetries = 3;
  
  // Try different models in order of preference (via OpenRouter)
  const models = [
    'openai/gpt-4o',
    'anthropic/claude-3-5-sonnet',
    'openai/gpt-4-turbo',
    'google/gemini-1.5-flash'
  ];
  
  const currentModel = models[Math.min(retryCount, models.length - 1)];
  
  try {
    // Use PDF context if available, otherwise use generic prompt
    const hasPdfContent = pdfContext && pdfContext.length > 100;
    
    console.log(`📄 PDF context available: ${hasPdfContent} (${pdfContext?.length || 0} chars)`);
    
    const prompt = hasPdfContent 
      ? `STRICT INSTRUCTIONS: You must ONLY use the information from the CamTech Knowledge Base below. Do NOT use any external knowledge or general information about universities. If the answer is not in this knowledge base, say "I don't have that specific information in the CamTech documentation."

=== CAMTECH KNOWLEDGE BASE ===
${pdfContext.substring(0, 18000)}
=== END KNOWLEDGE BASE ===

Question: ${userMessage}

Your answer must be based EXCLUSIVELY on the knowledge base above. Include specific details like degree names, durations, career pathways, salary ranges, and entry requirements when available.`
      : `You are a helpful assistant for CamTech educational institution. Answer the following question as best as you can: ${userMessage}`;

    console.log(`🤖 Trying model: ${currentModel} (attempt ${retryCount + 1})`);

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:5001",
          "X-Title": "CamTech Chatbot"
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      }
    );

    console.log(`📡 Response status: ${response.status}`);

    // Handle specific error codes
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      
      if (response.status === 503 && retryCount < maxRetries) {
        console.log(`⏳ Service unavailable, retrying...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
        return callOpenRouterAPI(userMessage, pdfContext, retryCount + 1);
      }
      
      if (response.status === 429) {
        console.log('⚠️  Rate limit exceeded');
        throw new Error('Rate limit exceeded - please try again later');
      }
      
      if (response.status === 401) {
        console.log('⚠️  Invalid API key');
        throw new Error('Invalid API key');
      }
      
      throw new Error(`OpenRouter API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenRouter API error: ${data.error.message}`);
    }

    const aiText = data?.choices?.[0]?.message?.content;
    
    if (!aiText) {
      console.log('⚠️  No text in response');
      throw new Error('No content in API response');
    }

    console.log(`✅ Success with model: ${currentModel}`);
    return aiText;
    
  } catch (error) {
    console.error(`🔥 OpenRouter API error with ${currentModel}:`, error.message);
    
    // If we've tried all models and retries, throw error
    if (retryCount >= maxRetries) {
      throw error;
    }
    
    // Try next model/retry
    return callOpenRouterAPI(userMessage, pdfContext, retryCount + 1);
  }
}

// PDF Processing Function
async function loadPdfText() {
  try {
    console.log('🔄 Loading PDF content...');
    
    // Check both Knowledge_base folder locations
    const possiblePaths = [
      path.resolve(process.cwd(), 'BackEnd/Knowledge_base/CamTech_info.pdf'),
      path.resolve(process.cwd(), 'BackEnd/Knowledge_base/CamTech_Info.pdf'),
      path.resolve(process.cwd(), 'Knowledge_base/CamTech_info.pdf'),
      path.resolve(process.cwd(), 'src/assets/CamTech_Info.pdf'),
      path.resolve(process.cwd(), 'public/CamTech_Info.pdf'),
      path.resolve(process.cwd(), 'assets/CamTech_Info.pdf'),
      path.resolve(process.cwd(), 'CamTech_Info.pdf')
    ];

    let filePath = null;
    for (const testPath of possiblePaths) {
      console.log(`🔍 Checking: ${testPath}`);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }

    if (!filePath) {
      console.warn('⚠️  PDF file not found. Server will use built-in responses.');
      return;
    }

    console.log(`📄 Found PDF at: ${filePath}`);
    
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const numPages = doc.numPages;
    
    let allText = [];
    
    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      
      const linesMap = {};
      content.items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if (!linesMap[y]) linesMap[y] = [];
        linesMap[y].push(item.str);
      });
      
      const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
      const pageText = sortedY.map(y => linesMap[y].join(' ')).join('\n');
      allText.push(`--- Page ${i} ---\n${pageText}`);
    }
    
    fullPdfText = allText.join('\n\n');
    console.log(`🎉 PDF loaded successfully! Total text length: ${fullPdfText.length} characters`);
    
  } catch (error) {
    console.error('❌ Error loading PDF:', error);
    console.log('🔄 Server will continue without PDF content');
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    serverReady: isServerReady,
    pdfLoaded: fullPdfText.length > 0,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/ask-gemini', async (req, res) => {
  const { userMessage } = req.body;
  
  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
    return res.status(400).json({ 
      error: 'Invalid request', 
      message: 'User message is required and must be a non-empty string' 
    });
  }

  console.log(`💬 User question: "${userMessage}"`);
  console.log(`📄 PDF context length: ${fullPdfText.length} chars`);

  try {
    // Call OpenRouter API with PDF context if available
    const aiResponse = await callOpenRouterAPI(userMessage, fullPdfText);
    
    console.log(`🤖 Response length: ${aiResponse.length} characters`);
    
    res.json({ 
      text: aiResponse,
      hasContext: fullPdfText.length > 0
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      message: 'Sorry, I encountered an error. Please try again.',
      details: error.message
    });
  }
});

// Start server
async function startServer() {
  console.log('🚀 Starting CamTecher Chatbot Server...');
  
  // Try to load from PDF first
  await loadPdfText();
  
  // If PDF didn't load, try the text file
  if (!fullPdfText || fullPdfText.length < 100) {
    console.log('📄 PDF not loaded, trying text knowledge base...');
    fullPdfText = loadKnowledgeBaseText();
  }
  
  app.listen(PORT, () => {
    isServerReady = true;
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/ask-gemini`);
    console.log(`📄 Knowledge base loaded: ${fullPdfText.length > 0 ? 'Yes' : 'No'} (${fullPdfText.length} chars)`);
    console.log('🔥 Ready to receive questions!');
  });
}

startServer().catch(error => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});

