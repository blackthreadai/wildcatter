'use client';

import { useState } from 'react';

export default function YouTubeWidget() {
  const [activeChannel, setActiveChannel] = useState('aljazeera');
  
  const channels = [
    { id: 'aljazeera', name: 'ALJAZEERA', url: 'https://youtu.be/gCNeDWCI0vo' },
    { id: 'bloomberg', name: 'BLOOMBERG', url: 'https://youtu.be/iEpJwprxDdk' },
    { id: 'cnbc', name: 'CNBC', url: 'https://youtu.be/9NyxcX3rhQs' },
    { id: 'euronews', name: 'EURONEWS', url: 'https://youtu.be/pykpO5kQJ98' },
  ];

  return (
    <div className="w-full flex flex-col bg-black border border-gray-700 h-full">
      {/* Header */}
      <div className="bg-gray-800 p-2 flex-shrink-0 flex items-center justify-center relative">
        <h3 className="text-white text-xs font-bold tracking-[0.2em] absolute left-2" style={{ fontStretch: 'condensed' }}>LIVE NEWS</h3>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-500 text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>LIVE</span>
        </div>
      </div>

      {/* Channel Selector - Compact */}
      <div className="bg-gray-900 px-2 py-1 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={`px-2 py-1 text-xs font-bold tracking-[0.1em] whitespace-nowrap border ${
                activeChannel === channel.id
                  ? 'bg-[#DAA520] text-black border-[#DAA520]'
                  : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-500'
              }`}
            >
              {channel.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area - Optimized for shorter height */}
      <div className="flex-1 p-1 bg-black min-h-0">
        {(() => {
          const channel = channels.find(c => c.id === activeChannel);
          const url = channel?.url;
          
          if (url && url !== '#') {
            // Convert YouTube URL to embed format
            const embedUrl = url.replace('youtu.be/', 'www.youtube.com/embed/').replace('watch?v=', 'embed/');
            
            return (
              <div className="h-full w-full">
                <iframe
                  src={`${embedUrl}?autoplay=0&mute=0&controls=1&modestbranding=1&rel=0`}
                  title={`${channel.name} Live Stream`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    border: 'none',
                    borderRadius: '4px'
                  }}
                />
              </div>
            );
          } else {
            return (
              <div className="flex items-center justify-center h-full text-center text-gray-400">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {channel?.name} Live Stream
                  </p>
                  <p className="text-xs text-gray-600">
                    Coming Soon
                  </p>
                </div>
              </div>
            );
          }
        })()}
      </div>
    </div>
  );
}