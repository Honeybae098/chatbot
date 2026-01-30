const geminiService = require('../services/geminiService');
const contextService = require('../services/contextService');
const Message = require('../models/Message');
const Session = require('../models/Session');
const { detectIntent } = require('../prompts/conversation-prompts');

exports.handleMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    // Validate input
    if (!message || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Message and sessionId are required'
      });
    }
    
    // Update session last activity
    await Session.findOneAndUpdate(
      { sessionId },
      { lastActivity: new Date() },
      { upsert: true, new: true }
    );
    
    // Detect intent for analytics
    const intent = detectIntent(message);
    
    // Save user message
    await Message.create({
      sessionId,
      sender: 'user',
      content: message,
      metadata: { intent }
    });
    
    // Generate AI response
    const aiResponse = await geminiService.generateResponse(message, sessionId);
    
    // Save bot response
    await Message.create({
      sessionId,
      sender: 'bot',
      content: aiResponse.text,
      metadata: {
        intent,
        confidence: aiResponse.confidence,
        needsEscalation: aiResponse.needsEscalation
      }
    });
    
    // Return response
    res.json({
      success: true,
      reply: aiResponse.text,
      needsEscalation: aiResponse.needsEscalation,
      confidence: aiResponse.confidence
    });
    
  } catch (error) {
    console.error('Error in handleMessage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      reply: "I'm having trouble right now. Please try again or contact our admissions office directly at admissions@camtech.edu.kh"
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const messages = await Message.find({ sessionId })
      .sort({ timestamp: 1 })
      .limit(50); // Last 50 messages
    
    res.json({
      success: true,
      messages
    });
    
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve history'
    });
  }
};