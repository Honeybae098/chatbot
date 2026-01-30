// OpenRouter API Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";

const OPENROUTER_CONFIG = {
  apiKey: OPENROUTER_API_KEY,
  baseUrl: "https://openrouter.ai/api/v1",
  defaultModel: "openai/gpt-4o",
  models: [
    "openai/gpt-4o",
    "anthropic/claude-3-5-sonnet",
    "openai/gpt-4-turbo",
    "google/gemini-1.5-flash"
  ],
  headers: {
    "HTTP-Referer": "http://localhost:5001",
    "X-Title": "CamTech Chatbot"
  }
};

module.exports = {
  OPENROUTER_API_KEY,
  OPENROUTER_CONFIG
};

