# CamTech University Chatbot - Project Summary

## 📋 Project Overview

The CamTech Chatbot is an AI-powered assistant for Cambodia University of Technology and Science (CamTech). It helps prospective and current students get answers about academic programs, admissions, campus facilities, and other university-related questions.

**Project Path:** `/Users/macbook/Downloads/chatbot`

---

## ✅ What Has Been Completed

### 1. **Backend Architecture**
- **Server Setup (server.js):** Express.js server running on port 5001
- **API Endpoints:**
  - `GET /api/health` - Health check endpoint
  - `POST /api/ask-gemini` - Main chat endpoint (note: renamed but uses DeepSeek)
- **Middleware:** CORS configuration for localhost (ports 5173, 3000)

### 2. **AI Services Configuration**
- **Primary:** DeepSeek service using Ollama (localhost:11434)
  - Model: `deepseek-r1:latest`
  - Configured with 10 fallback servers (local + public Ollama instances)
  - Automatic failover between servers
  
- **Fallback:** OpenRouter API (for when Ollama is unavailable)
  - API Key: `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`
  - Multiple model options: GPT-4o, Claude-3.5-sonnet, Gemini-1.5-flash
  - Handles complex queries when DeepSeek fails

### 3. **Knowledge Base System**
- **PDF Processing:** `loadPdfText()` function parses `CamTech_info.pdf`
- **Text Knowledge Base:** `camtech-knowledge-base.txt` as backup
- **Knowledge Formatter:** `utils/knowledgeFormatter.js` extracts and formats Q&A
- **Context Service:** `services/contextService.js` manages RAG (Retrieval-Augmented Generation)

### 4. **Prompt Engineering**
- **System Prompt:** Comprehensive CamTechBot persona with:
  - University identity and tone guidelines
  - Response structure for different query types
  - Escalation triggers for complex questions
  
- **Conversation Prompts:** Intent detection for:
  - `program_inquiry` - Questions about specific programs
  - `admission_process` - Application and enrollment questions
  - `comparison` - Program comparison questions
  - `career_inquiry` - Job and salary questions
  - `facility_inquiry` - Campus facilities

### 5. **Frontend Interface**
- **React Components:**
  - `CamTecherChatbot.jsx` - Main chatbot UI
  - Clean, responsive design with sidebar navigation
  - Message bubbles with quick reply buttons
  - Typing indicators
  
- **Features:**
  - Built-in responses for common questions
  - API fallback for complex queries
  - Quick reply suggestions
  - Mobile-responsive layout

### 6. **Database Models (Ready for Implementation)**
- **Message Model:** Stores conversation history
- **Session Model:** Tracks user sessions
- **Analytics Model:** For tracking usage metrics

### 7. **Additional Services**
- **PDF Service:** PDF text extraction
- **RAG Service:** Retrieval-Augmented Generation
- **Escalation Service:** For complex inquiries
- **Error Handler & Rate Limiter:** Middleware protection

---

## 🔄 Recent Changes Made

### API Key Transition (Completed)
- ✅ Replaced Google Gemini API with OpenRouter API
- ✅ Updated server.js, config/gemini.js, and services/geminiService.js
- ✅ OpenRouter API key configured and tested

---

## 📝 What Needs to Be Updated

### 1. **API Endpoint Naming**
- **Issue:** The endpoint is `/api/ask-gemini` but uses DeepSeek/OpenRouter
- **Solution:** Rename to `/api/chat` or `/api/ask` for accuracy
- **Files to update:**
  - `server.js` (route definition)
  - `CamTecherChatbot.jsx` (API call URL)

### 2. **Frontend-Backend Integration**
- **Issue:** `CamTecherChatbot.jsx` calls `http://localhost:5001/api/ask-gemini`
- **Issue:** Currently mixes built-in responses AND API calls
- **Solution:** Clean up the architecture for better separation

### 3. **Database Connection**
- **Issue:** Database models exist but are not connected
- **Solution:** 
  - Install MongoDB/Mongoose
  - Configure connection in `config/database.js`
  - Uncomment database code in `chatController.js`

### 4. **Remove Deprecated Code**
- **Files with outdated code:**
  - `controllers/chatController.js` - References `geminiService` (needs update)
  - `services/geminiService.js` - Old Google Gemini code
  - `routes/chat.js` - Legacy routes

### 5. **RAG Service Optimization**
- **Current:** Basic context injection
- **Improvement:** 
  - Implement vector embeddings for better search
  - Add semantic search capabilities
  - Optimize context window size

### 6. **Error Handling Improvements**
- **Add:**
  - Better error messages for users
  - Retry logic for failed API calls
  - Circuit breaker pattern for external APIs

### 7. **Environment Variables**
- **Hardcoded API Key in:** `server.js`
- **Solution:** Move to `.env` file
  - `OPENROUTER_API_KEY`
  - `OLLAMA_URL` (optional)

### 8. **Documentation**
- **Missing:**
  - README.md needs updating
  - API documentation
  - Setup instructions

---

## 🎯 Priority Matrix

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| HIGH | Rename API endpoint | Low | High |
| HIGH | Environment variables | Low | High |
| HIGH | Fix chatController.js | Medium | High |
| MEDIUM | Database connection | Medium | Medium |
| MEDIUM | Remove deprecated code | Low | Medium |
| LOW | RAG optimization | High | Medium |
| LOW | Documentation | Medium | Low |

---

## 🚀 Recommended Next Steps

1. **Immediate (Quick Wins):**
   - Rename `/api/ask-gemini` to `/api/ask` in server.js
   - Update frontend API call URL
   - Move API key to `.env` file

2. **Short-term (1-2 days):**
   - Fix/update `chatController.js` to use DeepSeek service
   - Clean up deprecated services
   - Set up proper error handling

3. **Medium-term (1 week):**
   - Connect MongoDB database
   - Implement session tracking
   - Add analytics

4. **Long-term:**
   - Vector database for RAG
   - Multi-language support
   - Voice input capability
   - WhatsApp/Line integration

---

## 📁 Key Files Reference

```
chatbot/
├── BackEnd/
│   ├── server.js                    # Main server (READY)
│   ├── config/
│   │   ├── constants.js             # Constants (READY)
│   │   ├── database.js              # MongoDB config (NOT CONNECTED)
│   │   ├── deepseek.js              # DeepSeek Ollama config (READY)
│   │   └── gemini.js                # OpenRouter config (READY)
│   ├── controllers/
│   │   └── chatController.js        # Needs update (references geminiService)
│   ├── services/
│   │   ├── deepseekService.js       # Primary AI (READY)
│   │   ├── contextService.js        # RAG context (READY)
│   │   ├── ragService.js            # RAG (READY)
│   │   └── escalationService.js     # Escalation (READY)
│   ├── Prompt/
│   │   ├── system-prompt.js         # AI persona (READY)
│   │   └── conversation-prompts.js  # Intent detection (READY)
│   └── routes/
│       └── chat.js                  # Legacy routes (NEEDS UPDATE)
├── src/
│   └── components/Front/
│       └── CamTecherChatbot.jsx     # Frontend UI (NEEDS API UPDATE)
├── package.json
└── TODO.md
```

---

## ⚠️ Technical Debt Identified

1. **Mixed terminology:** "Gemini", "DeepSeek", "OpenRouter" used inconsistently
2. **Dead code:** Multiple unused services and routes
3. **Incomplete database integration:** Models exist but not used
4. **Hardcoded values:** API keys, URLs, timeouts
5. **Inconsistent error handling:** Different approaches in different files

---

*Generated: Project Analysis Summary*
*Last Updated: Current Session*

