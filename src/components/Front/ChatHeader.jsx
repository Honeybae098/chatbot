// src/components/ChatHeader.jsx
import React from 'react';
import logo from '../assets/logo.png'; // <- this is where it's used

const ChatHeader = () => {
  return (
    <div className="sticky top-0 bg-white z-10 text-center py-10 border-b border-gray-200 shadow-sm">
      <div className="w-24 h-24 mx-auto mb-4 rounded-full shadow-lg overflow-hidden">
        <img src={logo} alt="CamTecher Logo" className="w-full h-full object-contain" />
      </div>
      <h1 className="text-3xl font-bold text-gray-800 mb-1">Hi, I'm a CamTecher</h1>
      <p className="text-gray-500 text-base">Hello my future CamTecher! I'm here to assist you</p>
    </div>
  );
};

export default ChatHeader;
