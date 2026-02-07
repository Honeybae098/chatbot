/**
 * RAG Service - Retrieval-Augmented Generation Pipeline
 * 
 * Architecture:
 * 1. Intent Classification - Determine if RAG is needed
 * 2. Keyword-based Retrieval - Find relevant chunks from knowledge base
 * 3. Relevance Scoring - Filter by relevance threshold
 * 4. Context Building - Prepare context for LLM
 * 5. Response Generation - Generate grounded response
 */

import { fullPdfText, cleanMarkdown } from '../utils/globalState.js';

/**
 * Intent types for classification - EXPANDED for better differentiation
 */
export const IntentType = {
  GENERAL_CONVERSATION: 'general_conversation',
  PROGRAMS_QUERY: 'programs_query',          // What programs are available?
  ADMISSION_QUERY: 'admission_query',          // How to apply? Requirements?
  FEES_QUERY: 'fees_query',                   // Tuition? Costs? Scholarships?
  FACILITIES_QUERY: 'facilities_query',       // Campus? Library? Labs?
  GENERAL_INFO_QUERY: 'general_info_query',   // About CamTech? Location?
  CONTACTS_QUERY: 'contacts_query',             // Phone? Email? Address?
  DEADLINE_QUERY: 'deadline_query',           // Application deadlines?
  SCHEDULE_QUERY: 'schedule_query',           // Class schedule? Semesters?
  UNIVERSITY_KNOWLEDGE: 'university_knowledge'
};

/**
 * Query patterns to classify intent - MORE SPECIFIC
 */
const INTENT_PATTERNS = {
  PROGRAMS_QUERY: [
    /program/i, /degree/i, /course/i, /major/i, /offer/i,
    /what can i study/i, /what do you offer/i, /academic program/i,
    /bachelor/i, /master/i, /phd/i, /study program/i
  ],
  ADMISSION_QUERY: [
    /admission/i, /apply/i, /application/i, /enrollment/i,
    /requirement/i, /eligibility/i, /qualify/i, /how to join/i,
    /entrance exam/i, /interview/i, /portfolio/i
  ],
  FEES_QUERY: [
    /fee/i, /tuition/i, /cost/i, /price/i, /payment/i,
    /scholarship/i, /financial/i, /money/i, /expensive/i,
    /budget/i, /refund/i
  ],
  FACILITIES_QUERY: [
    /facility/i, /campus/i, /library/i, /laboratory/i, /lab/i,
    /wifi/i, /sport/i, /gym/i, /canteen/i, /hostel/i,
    /dormitory/i, /accommodation/i, /computer/i, /equipment/i
  ],
  GENERAL_INFO_QUERY: [
    /about/i, /what is camtech/i, /university/i, /who founded/i,
    /history/i, /mission/i, /vision/i, /location/i, /address/i,
    /founded/i, /established/i, /private/i, /government/i
  ],
  CONTACTS_QUERY: [
    /contact/i, /phone/i, /email/i, /address/i, /call/i,
    /reach/i, /office/i, /admission office/i
  ],
  DEADLINE_QUERY: [
    /deadline/i, /due date/i, /last date/i, /when apply/i,
    /application period/i, /cut-off/i
  ],
  SCHEDULE_QUERY: [
    /schedule/i, /timetable/i, /semester/i, /class time/i,
    /duration/i, /how long/i, /year/i, /intake/i
  ]
};

/**
 * General conversation triggers
 */
const GENERAL_CONVERSATION_TRIGGERS = [
  'hello', 'hi', 'hey', 'thanks', 'thank you', 'goodbye', 'bye',
  'how are you', 'what can you do', 'who are you', 'help me'
];

/**
 * Classify user intent - MORE GRANULAR
 */
export function classifyIntent(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check for general conversation first
  for (const trigger of GENERAL_CONVERSATION_TRIGGERS) {
    if (lowerMessage.includes(trigger)) {
      return IntentType.GENERAL_CONVERSATION;
    }
  }
  
  // Check each specific intent category
  for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return IntentType[intentType];
      }
    }
  }
  
  // Default to general university knowledge
  return IntentType.UNIVERSITY_KNOWLEDGE;
}

/**
 * Retrieve relevant chunks - IMPROVED with better scoring
 */
export function retrieveRelevantChunks(query, maxChunks = 5, minScore = 0.3) {
  if (!fullPdfText || fullPdfText.length < 100) {
    return { chunks: [], hasKnowledge: false };
  }
  
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);
  
  // Split knowledge base into chunks - IMPROVED CHUNKING
  const chunks = splitIntoChunks(fullPdfText);
  
  // Score each chunk
  const scoredChunks = chunks.map((chunk, index) => {
    const result = scoreChunk(chunk, lowerQuery, queryWords);
    return {
      content: chunk,
      index,
      score: result.score,
      matchedKeywords: result.matchedKeywords,
      relevance: result.relevance
    };
  });
  
  // Sort by score and filter
  const relevantChunks = scoredChunks
    .filter(chunk => chunk.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks);
  
  return {
    chunks: relevantChunks,
    hasKnowledge: relevantChunks.length > 0,
    totalChunks: chunks.length,
    queryWords,
    intent: classifyIntent(query)
  };
}

/**
 * Improved chunking - split by sections and subsections
 */
function splitIntoChunks(text) {
  const chunks = [];
  
  // Split by page markers first
  const pages = text.split(/--- Page \d+ ---/);
  
  for (const page of pages) {
    // Split by major section headers (all caps or numbered sections)
    const sections = page.split(/(?=\d+\.\s+[A-Z])|(?=\n[A-Z][A-Z\s]+:\n)|(?=\n\n[A-Z])/);
    
    for (const section of sections) {
      const cleaned = section.trim();
      if (cleaned.length > 50 && cleaned.length < 2000) {
        chunks.push(cleaned);
      } else if (cleaned.length >= 2000) {
        // Split large sections further
        const subChunks = splitLargeSection(cleaned);
        chunks.push(...subChunks);
      }
    }
  }
  
  return chunks.filter(c => c.length > 50);
}

/**
 * Split large sections into smaller pieces
 */
function splitLargeSection(section) {
  const subChunks = [];
  const paragraphs = section.split(/\n\n+/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length < 1500) {
      currentChunk += '\n\n' + para;
    } else {
      if (currentChunk.trim().length > 50) {
        subChunks.push(currentChunk.trim());
      }
      currentChunk = para;
    }
  }
  
  if (currentChunk.trim().length > 50) {
    subChunks.push(currentChunk.trim());
  }
  
  return subChunks;
}

/**
 * Score a chunk for relevance - MORE SOPHISTICATED
 */
function scoreChunk(chunk, query, queryWords) {
  const lowerChunk = chunk.toLowerCase();
  let score = 0;
  const matchedKeywords = [];
  
  // 1. Direct keyword matches
  for (const word of queryWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = (lowerChunk.match(regex) || []).length;
    if (matches > 0) {
      score += matches * 2; // Weighted
      matchedKeywords.push(word);
    }
  }
  
  // 2. Topic-specific scoring
  const topicScores = {
    'program': { keywords: ['program', 'degree', 'course', 'faculty'], weight: 5 },
    'admission': { keywords: ['admission', 'apply', 'requirement', 'eligibility', 'entrance'], weight: 5 },
    'fee': { keywords: ['fee', 'tuition', 'cost', 'payment', 'scholarship'], weight: 5 },
    'deadline': { keywords: ['deadline', 'due date', 'application period'], weight: 6 },
    'facility': { keywords: ['facility', 'library', 'laboratory', 'campus', 'equipment'], weight: 5 }
  };
  
  for (const [topic, config] of Object.entries(topicScores)) {
    if (query.includes(topic)) {
      for (const keyword of config.keywords) {
        if (lowerChunk.includes(keyword)) {
          score += config.weight;
        }
      }
    }
  }
  
  // 3. Penalize if chunk has many topics (might be irrelevant)
  const topicCount = Object.values(topicScores).filter(t => 
    t.keywords.some(k => lowerChunk.includes(k))
  ).length;
  
  // 4. Normalize by chunk length
  const normalizedScore = score / Math.max(chunk.length / 200, 1);
  
  // 5. Boost exact phrase matches
  if (lowerChunk.includes(query)) {
    normalizedScore += 3;
  }
  
  return {
    score: normalizedScore,
    matchedKeywords: [...new Set(matchedKeywords)],
    relevance: normalizedScore > 0.5 ? 'high' : normalizedScore > 0.2 ? 'medium' : 'low'
  };
}

/**
 * Build context from retrieved chunks
 */
export function buildContext(retrievalResult, query) {
  if (!retrievalResult.hasKnowledge || retrievalResult.chunks.length === 0) {
    return {
      context: '',
      sources: [],
      hasRelevantInfo: false
    };
  }
  
  const context = retrievalResult.chunks.map((chunk, index) => {
    return `[Source ${index + 1}] (Relevance: ${chunk.relevance})\n${chunk.content}`;
  }).join('\n\n');
  
  return {
    context,
    sources: retrievalResult.chunks.map(c => ({
      index: c.index,
      score: c.score.toFixed(3),
      keywords: c.matchedKeywords,
      relevance: c.relevance
    })),
    hasRelevantInfo: true,
    queryWords: retrievalResult.queryWords,
    intent: retrievalResult.intent
  };
}

/**
 * REASONING-FOCUSED PROMPTS
 * These prompts force the LLM to analyze, compare, and generate custom responses
 */
const REASONING_PROMPTS = {
  PROGRAMS: `You are CamBot, an intelligent assistant for CamTech University.

## TASK
Analyze the user's question about academic programs and generate a thoughtful, tailored response.

## USER QUESTION
{query}

## AVAILABLE KNOWLEDGE
{context}

## YOUR THINKING PROCESS (Internal - do not output):
1. What specific programs is the user asking about?
2. Which of these programs are actually mentioned in the knowledge base?
3. What are the key features of each program that would be helpful to mention?
4. Are there any requirements or durations mentioned that are relevant?

## RESPONSE INSTRUCTIONS
1. Answer the SPECIFIC question asked - don't just list everything
2. Organize information clearly by program
3. Include relevant details (duration, faculty, career paths) only if mentioned
4. If programs aren't directly listed, analyze what related information IS available
5. End with a helpful next step or invitation for follow-up

## RESPONSE
{output_placeholder}`,

  ADMISSION: `You are CamBot, an intelligent assistant for CamTech University.

## TASK
Analyze the user's question about admissions and requirements, then provide a clear, step-by-step explanation.

## USER QUESTION
{query}

## KNOWLEDAGE BASE INFORMATION
{context}

## YOUR THINKING PROCESS:
1. What specific aspect of admission is the user asking about?
2. What requirements are mentioned in the knowledge base?
3. What is the sequence or process for admission?
4. Are there any deadlines or important dates?

## RESPONSE INSTRUCTIONS
1. Be specific to what the user asked (requirements, process, deadlines, etc.)
2. Use numbered steps for processes
3. Highlight any important requirements or conditions
4. If information is missing, clearly state what's NOT available
5. Suggest contacting admissions for details you don't have

## RESPONSE
{output_placeholder}`,

  FEES: `You are CamBot, an intelligent assistant for CamTech University.

## TASK
Analyze the user's question about fees, costs, or scholarships and provide detailed financial information.

## USER QUESTION
{query}

## FINANCIAL INFORMATION AVAILABLE
{context}

## YOUR THINKING PROCESS:
1. What specific financial aspect is the user asking about?
2. What tuition or fee amounts are mentioned?
3. Are there scholarships or financial aid options?
4. What payment options or schedules exist?

## RESPONSE INSTRUCTIONS
1. Be specific about any dollar amounts mentioned
2. Organize by category (tuition, scholarships, other fees)
3. If exact figures aren't available, explain what IS known
4. Encourage contacting admissions for exact current pricing
5. Include any scholarship eligibility requirements

## RESPONSE
{output_placeholder}`,

  DEADLINE: `You are CamBot, an intelligent assistant for CamTech University.

## TASK
Analyze the user's question about deadlines, timelines, or important dates.

## USER QUESTION
{query}

## TIMELINE INFORMATION
{context}

## YOUR THINKING PROCESS:
1. What deadline or timeline is the user asking about?
2. What specific dates are mentioned?
3. What application phases or milestones exist?
4. When do classes typically start?

## RESPONSE INSTRUCTIONS
1. List any specific dates mentioned
2. Explain the application timeline if available
3. Clarify if deadlines are for specific terms/semesters
4. Recommend checking the website for current deadlines
5. Suggest when the user should start the application process

## RESPONSE
{output_placeholder}`,

  FACILITIES: `You are CamBot, an intelligent assistant for CamTech University.

## TASK
Describe CamTech's campus facilities based on the available information.

## USER QUESTION
{query}

## FACILITY INFORMATION
{context}

## YOUR THINKING PROCESS:
1. What specific facilities is the user asking about?
2. What facilities are actually documented in the knowledge base?
3. What makes each facility noteworthy or unique?
4. Are there any specific features or technologies mentioned?

## RESPONSE INSTRUCTIONS
1. Describe ONLY the facilities that are documented
2. Be specific about features and technologies
3. Group related facilities together logically
4. If something isn't documented, don't mention it
5. Suggest visiting campus for a firsthand experience

## RESPONSE
{output_placeholder}`,

  GENERAL: `You are CamBot, an intelligent assistant for CamTech University.

## TASK
Answer the user's question about CamTech University using the provided knowledge.

## USER QUESTION
{query}

## RELEVANT INFORMATION
{context}

## YOUR THINKING PROCESS:
1. What is the user specifically asking about?
2. What information in the knowledge base directly addresses this?
3. What key points should I highlight?
4. What additional context might be helpful?

## RESPONSE INSTRUCTIONS
1. Answer the specific question asked
2. Highlight the most important/relevant points
3. Organize information logically
4. If information is incomplete, acknowledge this
5. Suggest good follow-up questions

## RESPONSE
{output_placeholder}`
};

/**
 * Get reasoning prompt based on intent
 */
function getReasoningPrompt(intent) {
  const promptMap = {
    [IntentType.PROGRAMS_QUERY]: REASONING_PROMPTS.PROGRAMS,
    [IntentType.ADMISSION_QUERY]: REASONING_PROMPTS.ADMISSION,
    [IntentType.FEES_QUERY]: REASONING_PROMPTS.FEES,
    [IntentType.DEADLINE_QUERY]: REASONING_PROMPTS.DEADLINE,
    [IntentType.FACILITIES_QUERY]: REASONING_PROMPTS.FACILITIES,
    [IntentType.GENERAL_INFO_QUERY]: REASONING_PROMPTS.GENERAL,
    [IntentType.UNIVERSITY_KNOWLEDGE]: REASONING_PROMPTS.GENERAL
  };
  
  return promptMap[intent] || REASONING_PROMPTS.GENERAL;
}

/**
 * Generate response based on retrieval results - REASONING-FOCUSED
 */
export function generateRAGResponse(query, retrievalResult) {
  const { hasRelevantInfo, context, sources, queryWords, intent } = buildContext(retrievalResult, query);
  
  if (!hasRelevantInfo || !context) {
    return {
      hasRelevantInfo: false,
      systemPrompt: REASONING_PROMPTS.GENERAL
        .replace('{query}', query)
        .replace('{context}', 'No specific information found in the knowledge base.')
        .replace('{output_placeholder}', 'I don\'t have specific information about this topic in my knowledge base. Please contact CamTech admissions office for details.'),
      sources: [],
      queryWords
    };
  }
  
  const reasoningPrompt = getReasoningPrompt(intent);
  
  const systemPrompt = reasoningPrompt
    .replace('{query}', query)
    .replace('{context}', context)
    .replace('{output_placeholder}', '');
  
  return {
    systemPrompt,
    requiresHallucination: false,
    sources,
    hasRelevantInfo: true,
    queryWords,
    intent
  };
}

/**
 * Handle general conversation responses (no RAG needed)
 */
export function handleGeneralConversation(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
    return {
      text: `Hello! I'm CamBot, the official AI assistant for CamTech University. 
I'm here to help you with information about:

• Academic programs and courses
• Admissions and enrollment
• Campus facilities and services
• Student life and activities

What would you like to know about CamTech University?`,
      requiresHallucination: false,
      type: IntentType.GENERAL_CONVERSATION
    };
  }
  
  if (lowerQuery.includes('thank')) {
    return {
      text: "You're welcome! Is there anything else I can help you with about CamTech University?",
      requiresHallucination: false,
      type: IntentType.GENERAL_CONVERSATION
    };
  }
  
  if (lowerQuery.includes('bye') || lowerQuery.includes('goodbye')) {
    return {
      text: "Goodbye! Feel free to return if you have any questions about CamTech University. Have a great day!",
      requiresHallucination: false,
      type: IntentType.GENERAL_CONVERSATION
    };
  }
  
  if (lowerQuery.includes('what can you do')) {
    return {
      text: `I can help you with information about CamTech University:

• Program details and requirements
• Admission processes and deadlines
• Campus facilities and services
• Student support and activities
• General university information

What would you like to know?`,
      requiresHallucination: false,
      type: IntentType.GENERAL_CONVERSATION
    };
  }
  
  return {
    text: "I understand you're reaching out, but I'm specialized in answering questions about CamTech University. Could you please ask a specific question about the university?",
    requiresHallucination: false,
    type: IntentType.GENERAL_CONVERSATION
  };
}

