/**
 * DeepSeek API Service
 * Uses free Ollama servers with automatic failover
 */

import config, { getServers, getModelSettings } from '../config/deepseek.js';
const servers = getServers();
const getModelSettingsFn = getModelSettings;
import { CAMTECH_SYSTEM_PROMPT } from '../Prompt/system-prompt.js';
import { buildContextualPrompt, detectIntent } from '../Prompt/conversation-prompts.js';

class DeepSeekService {
  constructor() {
    this.currentServerIndex = 0;
    this.knowledgeBase = null;
    this.serverHealth = new Map(); // Track server health status
    this.OLLAMA_SERVERS = servers;
    this.DEEPSEEK_CONFIG = {
      apiEndpoint: '/api/generate',
      temperature: 0.3,
      maxTokens: 2048,
      keepAlive: '5m',
      requestTimeout: 120000,
      model: config.defaultModel
    };
  }

  /**
   * Initialize the service - only use localhost for fast startup
   */
  async initialize() {
    console.log('🚀 Initializing DeepSeek Service...');
    
    // Only test localhost (index 0) - skip public servers
    const isHealthy = await this.testServerConnection(0);
    
    if (!isHealthy) {
      console.log('⚠️  Localhost Ollama not available');
      console.log('💡 Make sure Ollama is running: ollama serve');
      console.log('💡 Make sure model is installed: ollama pull deepseek-r1:latest');
      this.currentServerIndex = 0;
    } else {
      console.log('✅ Primary server (localhost) is healthy');
    }
    
    console.log(`🌐 Using server: ${this.OLLAMA_SERVERS[this.currentServerIndex].name}`);
    console.log(`🤖 DeepSeek Service ready with model: ${this.DEEPSEEK_CONFIG.model}`);
  }

  /**
   * Test connection to a specific server
   */
  async testServerConnection(serverIndex) {
    const server = this.OLLAMA_SERVERS[serverIndex];
    if (!server) {
      console.warn(`⚠️  Server index ${serverIndex} not found`);
      return false;
    }

    try {
      const testPrompt = 'Hello';
      const response = await fetch(`${server.url}${this.DEEPSEEK_CONFIG.apiEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: server.model,
          prompt: testPrompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 10
          }
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout for test
      });

      if (response.ok) {
        console.log(`✅ Server ${server.name} is healthy`);
        this.serverHealth.set(serverIndex, true);
        return true;
      } else {
        console.warn(`⚠️  Server ${server.name} returned status ${response.status}`);
        this.serverHealth.set(serverIndex, false);
        return false;
      }
    } catch (error) {
      console.warn(`❌ Server ${server.name} connection failed: ${error.message}`);
      this.serverHealth.set(serverIndex, false);
      return false;
    }
  }

  /**
   * Find the first healthy server
   */
  async findHealthyServer() {
    for (let i = 0; i < this.OLLAMA_SERVERS.length; i++) {
      console.log(`🔍 Testing server ${i + 1}/${this.OLLAMA_SERVERS.length}...`);
      const isHealthy = await this.testServerConnection(i);
      
      if (isHealthy) {
        this.currentServerIndex = i;
        console.log(`✅ Found healthy server: ${this.OLLAMA_SERVERS[i].name}`);
        return;
      }
    }
    
    // All servers failed, try primary anyway
    console.warn('⚠️  No healthy servers found, using primary server anyway');
    this.currentServerIndex = 0;
  }

  /**
   * Generate response using DeepSeek API - ONLY use localhost for now
   */
  async generateResponse(userMessage, conversationHistory = []) {
    // Only use localhost server (index 0)
    const server = this.OLLAMA_SERVERS[0];
    
    try {
      // Build the contextual prompt
      const contextualPrompt = this.buildPrompt(userMessage, conversationHistory);
      
      console.log(`🌐 Calling DeepSeek API on ${server.name}`);
      console.log(`📍 Server URL: ${server.url}`);
      console.log(`🤖 Model: ${this.DEEPSEEK_CONFIG.model}`);
      
      // Make API call
      const response = await this.callOllamaAPI(server, contextualPrompt);
      
      console.log(`✅ Response received from ${server.name} (${response.response.length} chars)`);
      
      return {
        text: response.response,
        server: server.name,
        model: this.DEEPSEEK_CONFIG.model,
        contextUsed: this.knowledgeBase ? true : false
      };
      
    } catch (error) {
      console.error(`❌ DeepSeek API Error:`, error.message);
      throw new Error(`Failed to connect to Ollama at ${server.url}. Make sure Ollama is running with 'ollama serve' and model 'deepseek-r1:latest' is installed.`);
    }
  }

  /**
   * Call Ollama API for a specific server
   */
  async callOllamaAPI(server, prompt) {
    const url = `${server.url}${this.DEEPSEEK_CONFIG.apiEndpoint}`;
    
    // Use server-specific model or fall back to default
    const modelName = server.model || this.DEEPSEEK_CONFIG.model;
    
    const requestBody = {
      model: modelName,
      prompt: prompt,
      stream: false,
      options: {
        temperature: this.DEEPSEEK_CONFIG.temperature,
        num_predict: this.DEEPSEEK_CONFIG.maxTokens,
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1,
        presence_penalty: 0,
        frequency_penalty: 0
      },
      keep_alive: this.DEEPSEEK_CONFIG.keepAlive
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEEPSEEK_CONFIG.requestTimeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Validate response
      if (!data.response) {
        throw new Error('No response field in API output');
      }

      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.DEEPSEEK_CONFIG.requestTimeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Build the full prompt for the AI
   */
  buildPrompt(userMessage, conversationHistory = []) {
    // Detect intent
    const intent = detectIntent(userMessage);
    
    // Build conversation context
    const recentHistory = conversationHistory.slice(-5);
    const context = recentHistory
      .map(msg => `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    // Start with system prompt
    let fullPrompt = CAMTECH_SYSTEM_PROMPT;
    
    // Add knowledge base context if available
    if (this.knowledgeBase && this.knowledgeBase.length > 100) {
      fullPrompt += `\n\n=== KNOWLEDGE BASE CONTEXT ===\n${this.knowledgeBase.substring(0, 15000)}\n=== END KNOWLEDGE BASE ===\n`;
    }
    
    // Add conversation history
    if (context) {
      fullPrompt += `\n\n=== CONVERSATION HISTORY ===\n${context}\n=== END HISTORY ===\n`;
    }
    
    // Add intent-specific instructions
    let intentInstructions = '';
    
    switch (intent) {
      case 'program_inquiry':
        intentInstructions = `
SPECIAL INSTRUCTION: Student is asking about a specific program.
Structure your response:
1. Program name and degree type
2. Brief overview (2 sentences)
3. Duration
4. Top 3 career outcomes
5. Key technology/skills learned
6. Ask if they want curriculum details or admission requirements`;
        break;
        
      case 'admission_process':
        intentInstructions = `
SPECIAL INSTRUCTION: Student is asking about admissions.
Provide:
1. Clear 3-step process
2. Specific exam details (Math: 90min, English: 60min)
3. Interview info (15 minutes)
4. Application link
5. Ask if they have questions about entrance exam content`;
        break;
        
      case 'comparison':
        intentInstructions = `
SPECIAL INSTRUCTION: Student is comparing programs.
DO NOT choose for them.
1. Ask about their interests: technology? business? creativity? social impact?
2. Ask about career goals
3. Present relevant programs based on their interests
4. Highlight key differences
5. Offer to connect with human advisor for personalized counseling`;
        break;
    }
    
    fullPrompt += intentInstructions;
    
    // Add current message
    fullPrompt += `\n\n=== CURRENT MESSAGE ===\nStudent: "${userMessage}"\n\nAssistant:`;
    
    return fullPrompt;
  }

  /**
   * Set knowledge base content
   */
  setKnowledgeBase(content) {
    this.knowledgeBase = content;
    console.log(`📚 Knowledge base set (${content?.length || 0} characters)`);
  }

  /**
   * Get current server info
   */
  getCurrentServer() {
    return this.OLLAMA_SERVERS[this.currentServerIndex];
  }

  /**
   * Get all servers status
   */
  getServersStatus() {
    return this.OLLAMA_SERVERS.map((server, index) => ({
      ...server,
      healthy: this.serverHealth.get(index) ?? null, // null = not tested
      current: index === this.currentServerIndex
    }));
  }
}

// Export singleton instance
const deepSeekService = new DeepSeekService();
export default deepSeekService;
