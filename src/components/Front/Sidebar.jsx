// src/components/Sidebar.jsx
import React from 'react';
import { BookOpen, Users, Calendar, FileText, Video } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="fixed left-0 top-0 w-20 h-full bg-white border-r border-gray-200 flex flex-col items-center py-6 z-10">
      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-8">
        <BookOpen className="w-6 h-6 text-white" />
      </div>
      <div className="space-y-4">
        {[Users, Calendar, FileText, Video].map((Icon, i) => (
          <button
            key={i}
            className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Icon className="w-6 h-6 text-gray-600" />
          </button>
        ))}
      </div>
      <div className="mt-auto">
        <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full"></div>
      </div>
    </div>
  );
};

export default Sidebar;
