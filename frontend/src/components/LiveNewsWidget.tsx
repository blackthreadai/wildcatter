'use client';

import { useState } from 'react';

const channels = [
  { id: 'bloomberg', name: 'BLOOMBERG', url: '#' },
  { id: 'skynews', name: 'SKYNEWS', url: '#' },
  { id: 'euronews', name: 'EURONEWS', url: '#' },
  { id: 'dw', name: 'DW', url: '#' },
  { id: 'cnbc', name: 'CNBC', url: '#' },
  { id: 'cnn', name: 'CNN', url: '#' },
  { id: 'france24', name: 'FRANCE24', url: '#' },
  { id: 'aljarabiya', name: 'ALJARABIYA', url: '#' },
  { id: 'aljazeera', name: 'ALJAZEERA', url: '#' },
];

export default function LiveNewsWidget() {
  const [activeChannel, setActiveChannel] = useState('bloomberg');

  return (
    <div className="h-full w-full flex flex-col bg-black">
      {/* Header */}
      <div className="bg-gray-800 p-2 flex-shrink-0 flex items-center justify-between">
        <h3 className="text-white text-xs font-semibold tracking-wider">LIVE NEWS</h3>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-500 text-xs font-bold">LIVE</span>
        </div>
      </div>

      {/* Channel Selector */}
      <div className="bg-gray-900 p-2 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all whitespace-nowrap ${
                activeChannel === channel.id
                  ? 'bg-[#DAA520] text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {channel.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-3 bg-black min-h-0 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 mx-auto mb-3 bg-gray-700 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xs text-gray-500 mb-1">
            {channels.find(c => c.id === activeChannel)?.name} Live Stream
          </p>
          <p className="text-xs text-gray-600">
            Stream will load when links are connected
          </p>
        </div>
      </div>
    </div>
  );
}