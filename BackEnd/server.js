import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import deepSeekService from './services/deepseekService.js';
import connectDB from './config/database.js';
import Message from './models/Message.js';
import Session from './models/Session.js';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

const PORT = 5001;

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";

// Global variables
let fullPdfText = '';
let isServerReady = false;
let dbConnected = false;

// Helper function to manage sessions
async function manageSession(sessionId, incrementCount = true) {
  try {
    const updateData = {
      lastActivity: new Date()
    };
    
    if (incrementCount) {
      updateData.$inc = { messageCount: 1 };
    }
    
    const session = await Session.findOneAndUpdate(
      { sessionId },
      updateData,
      { upsert: true, new: true }
    );
    
    // Log session info for new sessions
    if (session.messageCount === 1) {
      console.log(`🆕 New session created: ${sessionId}`);
    }
    
    return session;
  } catch (err) {
    console.warn('⚠️  Failed to manage session:', err.message);
    return null;
  }
}

// Helper function to save messages
async function saveMessage(sessionId, role, content, model = 'deepseek-r1') {
  try {
    const message = await Message.create({
      sessionId,
      role,
      content,
      model
    });
    return message;
  } catch (err) {
    console.warn(`⚠️  Failed to save ${role} message to MongoDB:`, err.message);
    return null;
  }
}

// Load knowledge base from text file
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

// Fallback: Call OpenRouter API when Ollama fails
async function callOpenRouterAPI(userMessage, pdfContext) {
  const models = [
    'openai/gpt-4o',
    'anthropic/claude-3-5-sonnet',
    'google/gemini-1.5-flash'
  ];
  
  const hasPdfContent = pdfContext && pdfContext.length > 100;
  
  const prompt = hasPdfContent 
    ? `STRICT INSTRUCTIONS: You must ONLY use the information from the CamTech Knowledge Base below. Do NOT use any external knowledge or general information about universities. If the answer is not in this knowledge base, say "I don't have that specific information in the CamTech documentation."

=== CAMTECH KNOWLEDGE BASE ===
${pdfContext.substring(0, 18000)}
=== END KNOWLEDGE BASE ===

Question: ${userMessage}

Your answer must be based EXCLUSIVELY on the knowledge base above.`
    : `You are a helpful assistant for CamTech educational institution. Answer the following question as best as you can: ${userMessage}`;

  for (const model of models) {
    try {
      console.log(`🌐 Trying OpenRouter fallback: ${model}`);
      
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
            model: model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 2000
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const aiText = data?.choices?.[0]?.message?.content;
        if (aiText) {
          console.log(`✅ OpenRouter success with ${model}`);
          return aiText;
        }
      }
    } catch (error) {
      console.warn(`⚠️  OpenRouter ${model} failed: ${error.message}`);
    }
  }
  
  throw new Error('All OpenRouter models failed');
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
    databaseConnected: dbConnected,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/ask-gemini', async (req, res) => {
  const { userMessage, sessionId } = req.body;
  
  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
    return res.status(400).json({ 
      error: 'Invalid request', 
      message: 'User message is required and must be a non-empty string' 
    });
  }

  // Generate session ID if not provided
  const chatSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`💬 User question: "${userMessage}"`);
  console.log(`📄 Knowledge base length: ${fullPdfText.length} chars`);
  console.log(`📂 Session ID: ${chatSessionId}`);

  // Save user message and update session in MongoDB
  await saveMessage(chatSessionId, 'user', userMessage);
  await manageSession(chatSessionId, true);

try {
    // Set knowledge base for DeepSeek service
    deepSeekService.setKnowledgeBase(fullPdfText);
    
    // Call DeepSeek API with knowledge base context
    const result = await deepSeekService.generateResponse(userMessage);
    
    console.log(`🤖 Response received from ${result.server} (${result.text.length} chars)`);
    
    // Save AI response to MongoDB
    await saveMessage(chatSessionId, 'assistant', result.text, result.model);
    await manageSession(chatSessionId, true);
    
    res.json({ 
      text: result.text,
      hasContext: fullPdfText.length > 0,
      server: result.server,
      model: result.model,
      sessionId: chatSessionId
    });
    
  } catch (error) {
    console.error('❌ DeepSeek API Error:', error.message);
    console.log('🔄 Trying OpenRouter fallback...');
    
    // Fallback to OpenRouter API
    try {
      const fallbackResult = await callOpenRouterAPI(userMessage, fullPdfText);
      
      console.log(`✅ OpenRouter fallback success (${fallbackResult.length} chars)`);
      
      // Save fallback response to MongoDB
      await saveMessage(chatSessionId, 'assistant', fallbackResult, 'fallback');
      await manageSession(chatSessionId, true);
      
      res.json({ 
        text: fallbackResult,
        hasContext: fullPdfText.length > 0,
        server: 'OpenRouter',
        model: 'fallback',
        sessionId: chatSessionId
      });
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      res.status(500).json({ 
        error: 'Failed to generate response',
        message: 'Sorry, I encountered an error. Please try again.',
        details: error.message
      });
    }
  }
});

// Start server
async function startServer() {
  console.log('🚀 Starting CamTecher Chatbot Server...');
  
  // Connect to MongoDB
  console.log('🔌 Connecting to MongoDB...');
  dbConnected = await connectDB();
  
  if (dbConnected) {
    console.log('✅ Database connection verified!');
  } else {
    console.warn('⚠️ Running in limited mode without database');
  }
  
  // Initialize DeepSeek service first
  console.log('🔧 Initializing DeepSeek service...');
  await deepSeekService.initialize();
  
  // Try to load from PDF first
  await loadPdfText();
  
  // If PDF didn't load, try the text file
  if (!fullPdfText || fullPdfText.length < 100) {
    console.log('📄 PDF not loaded, trying text knowledge base...');
    fullPdfText = loadKnowledgeBaseText();
  }
  
  // Set knowledge base for DeepSeek
  deepSeekService.setKnowledgeBase(fullPdfText);
  
  app.listen(PORT, () => {
    isServerReady = true;
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/ask-gemini`);
    console.log(`📄 Knowledge base loaded: ${fullPdfText.length > 0 ? 'Yes' : 'No'} (${fullPdfText.length} chars)`);
    console.log(`🤖 Using DeepSeek model: deepseek-r1 via Ollama`);
    console.log('🔥 Ready to receive questions!');
  });
}

startServer().catch(error => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});

