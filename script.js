import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Users, Calendar, FileText, Video } from 'lucide-react';

const generateAIResponse = async (userMessage) => {
  try {
    const response = await fetch('http://localhost:5000/api/ask-gemini', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage })
    });

    const data = await response.json();
    return data.text || "I couldn't find any answer.";
  } catch (error) {
    console.error('Error calling backend:', error);
    return "I'm having trouble accessing the information.";
  }
};
const API_URL = 'http://localhost:5000/api/ask-gemini'; // Update with your backend URL

const CamTecherChatBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello my future CamTecher!\nI'm here to assist you with any questions about courses, enrollment, or academic support!",
      sender: 'bot',
      timestamp: new Date(),
      quickReplies: [
        "Course Information",
        "Enrollment Process",
        "Schedule Classes",
        "Student Support"
      ]
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Generate response from Gemini AI
  const generateAIResponse = async (userMessage) => {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: userMessage }]
        }]
      })
    };

    try {
      const response = await fetch(API_URL, requestOptions);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get response from AI');
      }
      
      // Clean up the response text by removing markdown formatting
      const botAIResponse = data.candidates[0].content.parts[0].text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .trim();
      
      return botAIResponse;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return null;
    }
  };

  // Enhanced responses with AI fallback
  const predefinedResponses = {
    'course information': {
      text: "I can help you learn about our courses! What would you like to know?",
      quickReplies: ["Available Programs", "Course Duration", "Prerequisites", "Certification"]
    },
    'enrollment process': {
      text: "Ready to start your learning journey? Here's how to enroll:",
      quickReplies: ["Application Steps", "Required Documents", "Tuition Fees", "Payment Options"]
    },
    'schedule classes': {
      text: "Let me help you with class scheduling. What do you need?",
      quickReplies: ["View Timetable", "Book a Session", "Reschedule Class", "Virtual Classes"]
    },
    'student support': {
      text: "I'm here to support your learning experience! How can I help?",
      quickReplies: ["Academic Help", "Technical Issues", "Counseling Services", "Library Access"]
    },
    'available programs': {
      text: "We offer various programs:\n📚 Information Technology\n🎨 Digital Design\n💼 Business Administration\n🔬 Engineering\n🌐 Language Studies\n\nWhich program interests you?",
      quickReplies: ["IT Program", "Design Program", "Business Program", "More Info"]
    },
    'application steps': {
      text: "Enrollment is easy! Follow these steps:\n1️⃣ Fill out online application\n2️⃣ Submit required documents\n3️⃣ Take placement test (if required)\n4️⃣ Attend orientation session\n5️⃣ Begin your classes!\n\nNeed help with any step?",
      quickReplies: ["Start Application", "Document List", "Test Information", "Orientation"]
    },
    'view timetable': {
      text: "Here's your class schedule:\n\n📅 Monday: Web Development (9:00 AM)\n📅 Tuesday: Database Design (2:00 PM)\n📅 Wednesday: Mobile Apps (10:00 AM)\n📅 Thursday: Project Work (1:00 PM)\n📅 Friday: Presentation Skills (11:00 AM)\n\nWould you like to make changes?",
      quickReplies: ["Change Schedule", "Add Class", "Virtual Options", "Main Menu"]
    },
    'academic help': {
      text: "Our academic support includes:\n📖 Tutoring sessions\n👥 Study groups\n📝 Assignment help\n🎯 Exam preparation\n📚 Library resources\n\nWhat type of help do you need?",
      quickReplies: ["Book Tutor", "Join Study Group", "Assignment Help", "Exam Prep"]
    },
    'tuition fees': {
      text: "Our tuition structure:\n💰 Full Program: $2,500/semester\n📚 Individual Courses: $450/course\n🎓 Certification Programs: $1,200\n💳 Payment plans available\n🏆 Scholarships offered\n\nWould you like payment details?",
      quickReplies: ["Payment Plans", "Scholarship Info", "Financial Aid", "Course Prices"]
    },
    'main menu': {
      text: "How else can I help you with your education?",
      quickReplies: ["Course Information", "Enrollment Process", "Schedule Classes", "Student Support"]
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getBotResponse = async (userInput) => {
    const input = userInput.toLowerCase().trim();
    
    // Check for predefined responses first
    for (const key in predefinedResponses) {
      if (input.includes(key) || key.includes(input)) {
        return predefinedResponses[key];
      }
    }

    // If no predefined response found, use AI
    try {
      const aiResponse = await generateAIResponse(userInput);
      if (aiResponse) {
        return {
          text: aiResponse,
          quickReplies: ["Course Information", "Enrollment Process", "Student Support", "Main Menu"]
        };
      }
    } catch (error) {
      console.error('AI response error:', error);
    }

    // Fallback response
    return {
      text: "I'm here to help with your educational journey! Let me guide you to the right information:",
      quickReplies: ["Course Information", "Enrollment Process", "Student Support", "Contact Teacher"]
    };
  };

  const handleSendMessage = async (messageText = null) => {
    const text = messageText || inputMessage;
    if (text.trim() === '') return;

    const newMessage = {
      id: messages.length + 1,
      text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const botResponseData = await getBotResponse(text);
      
      setTimeout(() => {
        const botResponse = {
          id: messages.length + 2,
          text: botResponseData.text,
          sender: 'bot',
          timestamp: new Date(),
          quickReplies: botResponseData.quickReplies
        };
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      }, 1500); // Slightly longer delay for AI processing
    } catch (error) {
      console.error('Error handling message:', error);
      setTimeout(() => {
        const errorResponse = {
          id: messages.length + 2,
          text: "I apologize, but I'm having trouble processing your request right now. Please try again or select from the options below.",
          sender: 'bot',
          timestamp: new Date(),
          quickReplies: ["Course Information", "Enrollment Process", "Student Support", "Main Menu"]
        };
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleQuickReply = (reply) => {
    handleSendMessage(reply);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-lg md:text-xl">
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-0 w-20 h-full bg-white border-r border-gray-200 flex flex-col items-center py-6 z-10">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-8 overflow-hidden bg-blue-100">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">CT</span>
          </div>
        </div>

        <div className="space-y-4">
          {[Users, Calendar, FileText, Video].map((Icon, i) => (
            <button key={i} className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Icon className="w-6 h-6 text-gray-600" />
            </button>
          ))}
        </div>

        <div className="mt-auto">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full"></div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 ml-20 flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="w-full max-w-2xl mx-auto flex flex-col h-full">

            {/* Header */}
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full overflow-hidden shadow-lg bg-blue-100 flex items-center justify-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">CT</span>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-3">Hi, I'm CamTecher AI</h1>
              <p className="text-gray-500 mb-1">Hello my future CamTecher!</p>
              <p className="text-gray-500">I'm here to assist you with AI-powered support</p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 px-6 pb-6 overflow-y-auto">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id}>
                    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-lg px-5 py-4 rounded-2xl ${
                        message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="whitespace-pre-line">{message.text}</p>
                      </div>
                    </div>
                    {message.quickReplies && message.sender === 'bot' && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {message.quickReplies.map((reply, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuickReply(reply)}
                            className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-full hover:bg-blue-50 transition shadow-sm text-base"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-5 py-4">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-6">
              <div className="flex items-center space-x-4 bg-gray-50 rounded-full px-6 py-4 border border-gray-300">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about courses, enrollment, or academics..."
                  className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 text-base"
                />
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={inputMessage.trim() === ''}
                  className={`p-3 rounded-full transition-all ${
                    inputMessage.trim() === '' ? 'bg-gray-300 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CamTecherChatBot;