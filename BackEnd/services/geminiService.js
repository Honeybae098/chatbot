// OpenRouter API Service
const { OPENROUTER_API_KEY, OPENROUTER_CONFIG } = require('../config/gemini');
const { CAMTECH_SYSTEM_PROMPT } = require('../Prompt/system-prompt');
const { buildContextualPrompt } = require('../Prompt/conversation-prompts');
const pdfService = require('./pdfService');
const contextService = require('./contextService');

class OpenRouterService {
  constructor() {
    this.apiKey = OPENROUTER_API_KEY;
    this.baseUrl = OPENROUTER_CONFIG.baseUrl;
    this.defaultModel = OPENROUTER_CONFIG.defaultModel;
    this.knowledgeBase = null;
  }

  async initialize() {
    // Load knowledge base once at startup
    this.knowledgeBase = await pdfService.loadKnowledgeBase();
    console.log('✅ Knowledge base loaded');
  }

  async generateResponse(userMessage, sessionId) {
    try {
      // Get conversation history
      const history = await contextService.getContext(sessionId);
      
      // Build contextual prompt
      const prompt = buildContextualPrompt(
        userMessage, 
        history, 
        this.knowledgeBase
      );
      
      // Call OpenRouter API
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...OPENROUTER_CONFIG.headers
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      
      if (!text) {
        throw new Error('No content in API response');
      }
      
      // Check if response suggests escalation
      const needsEscalation = this.detectEscalation(text);
      
      return {
        text: text,
        needsEscalation: needsEscalation,
        confidence: this.calculateConfidence(text)
      };
      
    } catch (error) {
      console.error('OpenRouter API Error:', error);
      throw new Error('Failed to generate response');
    }
  }

  detectEscalation(responseText) {
    const escalationKeywords = [
      'recommend speaking with',
      'contact admissions',
      'reach out to',
      'personalized guidance',
      'human advisor'
    ];
    
    return escalationKeywords.some(keyword => 
      responseText.toLowerCase().includes(keyword)
    );
  }

  calculateConfidence(responseText) {
    // Simple confidence score based on response characteristics
    let score = 0.7; // Base confidence
    
    // Higher confidence if response includes specific details
    if (responseText.match(/\d+ years|GPA \d\.\d|duration|semester/i)) {
      score += 0.1;
    }
    
    // Lower confidence if response is vague
    if (responseText.match(/might|maybe|possibly|not sure/i)) {
      score -= 0.2;
    }
    
    // Lower confidence if suggesting to contact someone
    if (responseText.match(/contact|reach out|speak with/i)) {
      score -= 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, score));
  }
}

module.exports = new OpenRouterService();
