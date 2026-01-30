// src/components/ChatWindow.jsx
import React from 'react';
import { Send, Mic } from 'lucide-react';

const ChatWindow = ({
  messages,
  isTyping,
  inputMessage,
  setInputMessage,
  handleSendMessage,
  handleKeyPress,
  handleQuickReply,
  messagesEndRef
}) => {
  return (
    <>
      <div className="flex-1 px-6 pb-36 overflow-y-auto">
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

      {/* Fixed Input Bar */}
      <div className="p-6 fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 flex justify-center">
        <div className="w-full max-w-2xl">
          <div className="flex items-center space-x-4 bg-gray-50 rounded-full px-6 py-4 border border-gray-300 shadow-md">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message slothGPT..."
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
    </>
  );
};

export default ChatWindow;
