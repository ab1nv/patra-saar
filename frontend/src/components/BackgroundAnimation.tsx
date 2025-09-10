'use client';

import React from 'react';

export const BackgroundAnimation: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
      
      {/* Floating legal document icons */}
      <div className="absolute inset-0">
        {/* Document 1 */}
        <div className="absolute top-20 left-10 animate-float-slow">
          <div className="w-8 h-10 bg-blue-100 rounded-sm shadow-sm opacity-20 transform rotate-12">
            <div className="w-full h-2 bg-blue-200 rounded-t-sm"></div>
            <div className="p-1 space-y-1">
              <div className="w-4 h-0.5 bg-blue-300 rounded"></div>
              <div className="w-3 h-0.5 bg-blue-300 rounded"></div>
              <div className="w-5 h-0.5 bg-blue-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Document 2 */}
        <div className="absolute top-40 right-20 animate-float-medium">
          <div className="w-6 h-8 bg-indigo-100 rounded-sm shadow-sm opacity-15 transform -rotate-6">
            <div className="w-full h-1.5 bg-indigo-200 rounded-t-sm"></div>
            <div className="p-1 space-y-0.5">
              <div className="w-3 h-0.5 bg-indigo-300 rounded"></div>
              <div className="w-4 h-0.5 bg-indigo-300 rounded"></div>
              <div className="w-2 h-0.5 bg-indigo-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Document 3 */}
        <div className="absolute bottom-32 left-1/4 animate-float-fast">
          <div className="w-7 h-9 bg-purple-100 rounded-sm shadow-sm opacity-10 transform rotate-3">
            <div className="w-full h-2 bg-purple-200 rounded-t-sm"></div>
            <div className="p-1 space-y-0.5">
              <div className="w-4 h-0.5 bg-purple-300 rounded"></div>
              <div className="w-3 h-0.5 bg-purple-300 rounded"></div>
              <div className="w-5 h-0.5 bg-purple-300 rounded"></div>
              <div className="w-2 h-0.5 bg-purple-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Document 4 */}
        <div className="absolute top-60 left-2/3 animate-float-slow">
          <div className="w-5 h-7 bg-teal-100 rounded-sm shadow-sm opacity-20 transform -rotate-12">
            <div className="w-full h-1.5 bg-teal-200 rounded-t-sm"></div>
            <div className="p-0.5 space-y-0.5">
              <div className="w-3 h-0.5 bg-teal-300 rounded"></div>
              <div className="w-2 h-0.5 bg-teal-300 rounded"></div>
              <div className="w-4 h-0.5 bg-teal-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Document 5 */}
        <div className="absolute bottom-20 right-10 animate-float-medium">
          <div className="w-6 h-8 bg-emerald-100 rounded-sm shadow-sm opacity-15 transform rotate-8">
            <div className="w-full h-1.5 bg-emerald-200 rounded-t-sm"></div>
            <div className="p-1 space-y-0.5">
              <div className="w-4 h-0.5 bg-emerald-300 rounded"></div>
              <div className="w-3 h-0.5 bg-emerald-300 rounded"></div>
              <div className="w-2 h-0.5 bg-emerald-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Floating circles for depth */}
        <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-blue-100 rounded-full opacity-5 animate-pulse-slow"></div>
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-indigo-100 rounded-full opacity-10 animate-pulse-medium"></div>
        <div className="absolute top-2/3 left-1/6 w-20 h-20 bg-purple-100 rounded-full opacity-5 animate-pulse-fast"></div>
      </div>
    </div>
  );
};