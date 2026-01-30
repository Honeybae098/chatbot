import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Users, Calendar, FileText, Video, Bot, User } from 'lucide-react';

const CamTecherChatBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello my future CamTecher!\nI'm here to assist you with any questions about CamTech. I can access our information database to provide you with accurate answers.",
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

  // Built-in responses for quick replies and common questions
  const builtInResponses = {
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
      text: "CamTech University offers 10 Bachelor's degree programs:\n\n1. Architecture\n2. Cyber Security\n3. Data Science and AI Engineering\n4. Educational Technology\n5. Interior Design\n6. Media & Communication Technology\n7. Risk Management & Business Intelligence\n8. Robotics and Automation Engineering\n9. Software Engineering\n10. Innovation & Entrepreneurship\n\nWhich program would you like to learn more about?",
      quickReplies: ["Architecture", "Cyber Security", "Data Science", "Software Engineering", "More Info"]
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
    'virtual classes': {
      text: "Join your virtual classroom:\n🖥️ Live interactive sessions\n📹 Recorded lectures available\n💬 Real-time chat with instructors\n📱 Mobile app access\n🔗 Zoom integration\n\nReady to join a class?",
      quickReplies: ["Join Now", "Download App", "Test Connection", "Schedule Virtual"]
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

  // Check if message matches built-in responses
  const getBuiltInResponse = (userInput) => {
    const input = userInput.toLowerCase().trim();
    if (builtInResponses[input]) return builtInResponses[input];
    
    for (const key in builtInResponses) {
      if (input.includes(key) || key.includes(input)) {
        return builtInResponses[key];
      }
    }
    return null;
  };

  // Call OpenRouter API for complex questions
  const callGeminiAPI = async (userMessage) => {
    try {
      const response = await fetch('http://localhost:5001/api/ask-gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch from API');
      }

      const data = await response.json();
      return data.text || "I'm sorry, I couldn't find a specific answer to your question. Please try rephrasing or contact our support team.";
    } catch (error) {
      console.error('Error calling API:', error);
      return "I'm having trouble connecting to my knowledge base right now. Please check if the server is running or try again later.";
    }
  };

  const handleSendMessage = async (messageText = null) => {
    const text = messageText || inputMessage;
    if (text.trim() === '') return;

    const newMessage = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // First check for built-in responses
      const builtInResponse = getBuiltInResponse(text);
      
      let botResponseData;
      if (builtInResponse) {
        // Use built-in response
        botResponseData = builtInResponse;
      } else {
        // Call API for more complex questions
        const aiResponse = await callGeminiAPI(text);
        botResponseData = {
          text: aiResponse,
          quickReplies: ["Ask Another Question", "Main Menu", "Contact Support"]
        };
      }

      setTimeout(() => {
        const botResponse = {
          id: Date.now() + 1,
          text: botResponseData.text,
          sender: 'bot',
          timestamp: new Date(),
          quickReplies: botResponseData.quickReplies
        };
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      }, 1000);

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorResponse = {
        id: Date.now() + 1,
        text: "I apologize, but I'm experiencing some technical difficulties. Please try again or contact our support team.",
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: ["Try Again", "Contact Support", "Main Menu"]
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsTyping(false);
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
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-8 overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600">
          <Bot className="w-8 h-8 text-white" />
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
        {/* Chat Container */}
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="w-full max-w-2xl mx-auto flex flex-col h-full">

            {/* Header */}
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full overflow-hidden shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-3">Hi, I'm CamTecher AI</h1>
              <p className="text-gray-500 mb-1">Hello my future CamTecher!</p>
              <p className="text-gray-500">I'm here to assist you with AI-powered answers</p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 px-6 pb-6 overflow-y-auto">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id}>
                    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
                      {message.sender === 'bot' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={`max-w-lg px-5 py-4 rounded-2xl ${
                        message.sender === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                      }`}>
                        <p className="whitespace-pre-line">{message.text}</p>
                      </div>
                      {message.sender === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    {message.quickReplies && message.sender === 'bot' && (
                      <div className="mt-4 ml-10 flex flex-wrap gap-3">
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
                  <div className="flex justify-start items-end space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-5 py-4">
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
                  placeholder="Ask me anything about CamTech..."
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
              <p className="text-xs text-gray-400 text-center mt-2">
                Powered by OpenRouter AI • Can access CamTech documentation
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CamTecherChatBot;

