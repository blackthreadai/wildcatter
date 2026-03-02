'use client';

import { useState } from 'react';

export default function YouTubeWidget() {
  const [activeChannel, setActiveChannel] = useState('bloomberg');
  
  const channels = [
    { id: 'bloomberg', name: 'BLOOMBERG' },
    { id: 'skynews', name: 'SKYNEWS' },
    { id: 'euronews', name: 'EURONEWS' },
    { id: 'dw', name: 'DW' },
    { id: 'cnbc', name: 'CNBC' },
    { id: 'cnn', name: 'CNN' },
    { id: 'france24', name: 'FRANCE24' },
    { id: 'aljarabiya', name: 'ALJARABIYA' },
    { id: 'aljazeera', name: 'ALJAZEERA' },
  ];

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
                  ? 'bg-yellow-500 text-black'
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
          <p className="text-xs text-gray-500 mb-1">
            {channels.find(c => c.id === activeChannel)?.name} Live Stream
          </p>
          <p className="text-xs text-gray-600">
            Ready for live stream URLs
          </p>
        </div>
      </div>
    </div>
  );
}