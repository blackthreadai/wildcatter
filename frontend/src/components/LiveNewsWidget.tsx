'use client';

import { useState } from 'react';

export default function LiveNewsWidget() {
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
    <div className="h-full w-full bg-black border border-gray-800">
      {/* Header */}
      <div className="bg-gray-800 p-2 flex items-center justify-between">
        <h3 className="text-white text-xs font-semibold">LIVE NEWS</h3>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-red-500 text-xs font-bold">LIVE</span>
        </div>
      </div>

      {/* Channel Selector */}
      <div className="bg-gray-900 p-2 overflow-x-auto">
        <div className="flex gap-1">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                activeChannel === channel.id
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {channel.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 text-center text-gray-400">
        <p className="text-xs">{activeChannel.toUpperCase()} Stream</p>
        <p className="text-xs text-gray-600">Ready for live links</p>
      </div>
    </div>
  );
}