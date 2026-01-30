// prompts/conversation-prompts.js

function buildContextualPrompt(userMessage, conversationHistory, knowledgeBase) {
  // Get last 5 messages for context
  const recentHistory = conversationHistory.slice(-5);
  
  // Build conversation context
  const context = recentHistory
    .map(msg => `${msg.role === 'user' ? 'Student' : 'CamTechBot'}: ${msg.content}`)
    .join('\n');
  
  // Determine intent
  const intent = detectIntent(userMessage);
  
  let promptAddition = '';
  
  // Add intent-specific instructions
  if (intent === 'program_inquiry') {
    promptAddition = `
    
SPECIAL INSTRUCTION FOR THIS QUERY:
The student is asking about a specific program. Structure your response:
1. Program name and degree type
2. Brief overview (2 sentences)
3. Duration
4. Top 3 career outcomes
5. Key technology/skills learned
6. Ask if they want curriculum details, admission requirements, or career information`;
  }
  
  if (intent === 'admission_process') {
    promptAddition = `

SPECIAL INSTRUCTION FOR THIS QUERY:
The student is asking about admissions. Provide:
1. Clear 3-step process
2. Specific exam details (Math: 90min, English: 60min)
3. Interview info (15 minutes)
4. Application link
5. Ask if they have questions about entrance exam content`;
  }
  
  if (intent === 'comparison') {
    promptAddition = `

SPECIAL INSTRUCTION FOR THIS QUERY:
Student is comparing programs or seeking guidance. DO NOT choose for them.
1. Ask about their interests: technology? business? creativity? social impact?
2. Ask about career goals
3. Present relevant programs based on their interests
4. Highlight key differences
5. Offer to connect with human advisor for personalized counseling`;
  }
  
  return `${CAMTECH_SYSTEM_PROMPT}

RECENT CONVERSATION:
${context}

STUDENT'S CURRENT MESSAGE: "${userMessage}"
${promptAddition}

Respond naturally and helpfully based on the knowledge base and conversation history.`;
}

function detectIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  // Program inquiry keywords
  if (lowerMsg.match(/software engineering|computer science|data science|cybersecurity|architecture|interior|media|communication|robotics|innovation|entrepreneurship/)) {
    return 'program_inquiry';
  }
  
  // Admission keywords
  if (lowerMsg.match(/apply|application|entrance|exam|requirements|admission|how to join/)) {
    return 'admission_process';
  }
  
  // Comparison keywords
  if (lowerMsg.match(/which|better|compare|should i|choose|difference between|vs/)) {
    return 'comparison';
  }
  
  // Career keywords
  if (lowerMsg.match(/job|career|salary|work|employment|hire/)) {
    return 'career_inquiry';
  }
  
  // Facility keywords
  if (lowerMsg.match(/campus|facility|lab|library|sport|gym/)) {
    return 'facility_inquiry';
  }
  
  return 'general';
}

module.exports = { buildContextualPrompt, detectIntent };