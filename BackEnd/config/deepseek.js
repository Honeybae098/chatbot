/**
 * DeepSeek API Configuration
 * Server list with localhost priority and public fallback servers
 */

const config = {
  // Timeout settings (in milliseconds)
  timeouts: {
    connect: 5000,      // Connection timeout
    response: 120000,   // Response timeout (2 minutes for large models)
    retryDelay: 1000   // Delay between retries
  },
  
  // Number of retry attempts per server
  maxRetries: 2,
  
  // Server list (localhost first, then public servers)
  servers: [
    {
      name: 'localhost',
      url: 'http://localhost:11434',
      priority: 1,
      location: 'Local Machine',
      type: 'local'
    },
    {
      name: 'US Server 1',
      url: 'http://47.251.15.84:11434',
      priority: 2,
      location: 'United States',
      type: 'public'
    },
    {
      name: 'US Server 2',
      url: 'http://47.88.58.193:11434',
      priority: 3,
      location: 'United States',
      type: 'public'
    },
    {
      name: 'Germany Server 1',
      url: 'http://138.201.198.73:11434',
      priority: 4,
      location: 'Germany',
      type: 'public'
    },
    {
      name: 'Germany Server 70B',
      url: 'http://91.107.230.57:11434',
      priority: 5,
      location: 'Germany (70B Model)',
      type: 'public'
    },
    {
      name: 'Germany Oracle',
      url: 'http://130.61.213.45:11434',
      priority: 6,
      location: 'Germany (Oracle Cloud)',
      type: 'public'
    },
    {
      name: 'Germany Hetzner',
      url: 'http://49.13.172.209:11434',
      priority: 7,
      location: 'Germany (Hetzner)',
      type: 'public'
    },
    {
      name: 'Netherlands',
      url: 'http://62.72.13.204:11434',
      priority: 8,
      location: 'Netherlands',
      type: 'public'
    },
    {
      name: 'France',
      url: 'http://94.130.49.209:11434',
      priority: 9,
      location: 'France',
      type: 'public'
    },
    {
      name: 'Singapore',
      url: 'http://158.255.6.54:11434',
      priority: 10,
      location: 'Singapore',
      type: 'public'
    }
  ],
  
  // Default model settings
  defaultModel: 'deepseek-r1:latest',
  
  // Model-specific settings
  modelSettings: {
    'deepseek-r1:latest': {
      temperature: 0.3,
      num_predict: 2048,
      top_k: 40,
      top_p: 0.9,
      system: `You are CamBot, the official AI assistant for CamTech University in Cambodia.
Your goal is to provide accurate, helpful, and well-structured answers about CamTech University.

IMPORTANT FORMATTING RULES - FOLLOW EXACTLY:
1. Use clear headings (##) for main topics
2. Use bullet points (•) for all lists - start each bullet with a bullet character
3. Keep paragraphs short and concise
4. NEVER use asterisks (*) or **bold** formatting under any circumstances
5. Do NOT repeat the same information twice
6. Use emojis sparingly for visual appeal only
7. Structure your response with logical sections

CONTENT RULES:
- If the knowledge base has relevant information, use it to answer the question
- If the knowledge base does NOT have the information, use your OWN knowledge to provide a helpful answer
- You are a large language model with knowledge about universities and their programs worldwide
- When using your own knowledge, you can mention "Based on general knowledge about Cambodian universities..." or similar
- Always be helpful - don't just say "I don't know" or "I don't have that information"
- Provide useful, accurate information to the best of your ability

Knowledge Base Context: {context}
Current Date: {currentDate}

Provide accurate information about:
- Academic programs and courses
- Campus facilities and services
- Student life and activities
- Admissions and enrollment
- Technical support
- General university topics and questions`
    },
    'deepseek-r1:7b': {
      temperature: 0.3,
      num_predict: 2048,
      top_k: 40,
      top_p: 0.9,
      system: null
    },
    'deepseek-r1:1.5b': {
      temperature: 0.3,
      num_predict: 1024,
      top_k: 40,
      top_p: 0.9,
      system: null
    }
  },
  
  // Knowledge base file path
  knowledgeBase: {
    enabled: true,
    filePath: './data/knowledge-base.txt',
    maxContextLength: 3000
  },
  
  // API endpoint
  apiEndpoint: '/api/generate',
  tagsEndpoint: '/api/tags'
};

// Export functions for easy access
function getServers() {
  return config.servers;
}

function getDefaultModel() {
  return config.defaultModel;
}

function getModelSettings(model = config.defaultModel) {
  return config.modelSettings[model] || config.modelSettings[config.defaultModel];
}

function getTimeouts() {
  return config.timeouts;
}

function getServerByName(name) {
  return config.servers.find(s => s.name === name);
}

function getServerByPriority(priority) {
  return config.servers.find(s => s.priority === priority);
}

function getSetupInstructions() {
  return `
╔═══════════════════════════════════════════════════════════════╗
║           DEEPSEEK API SETUP INSTRUCTIONS                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  OPTION 1: LOCAL OLLAMA (RECOMMENDED)                         ║
║  ─────────────────────────────────────────────────────────    ║
║  1. Install:  curl -fsSL https://ollama.ai/install.sh | sh   ║
║  2. Start:    ollama serve                                   ║
║  3. Pull:     ollama pull deepseek-r1:latest                 ║
║  4. Server:  http://localhost:11434                         ║
║                                                               ║
║  OPTION 2: USE PUBLIC SERVERS                                ║
║  ─────────────────────────────────────────────────────────    ║
║  Code will automatically try all 10 public servers if local    ║
║  is not available. Some may be slow or unavailable.          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;
}

export default config;
export { getServers, getDefaultModel, getModelSettings, getTimeouts, getServerByName, getServerByPriority, getSetupInstructions };
