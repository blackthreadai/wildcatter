'use client';

import { useState, useEffect } from 'react';

export default function YouTubeWidget() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-semibold tracking-wider">LIVE NEWS</h3>
        </div>
        <div className="flex-1 bg-black flex items-center justify-center min-h-0">
          <div className="text-gray-500 text-xs">Loading stream...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-semibold tracking-wider">LIVE NEWS</h3>
      </div>
      
      <div className="flex-1 bg-black p-2">
        {/* Embedded Live YouTube Stream */}
        <div className="h-full w-full rounded overflow-hidden">
          <iframe
            src="https://www.youtube.com/embed/dp8PhLsUcFE?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0"
            title="Live News Stream"
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              border: 'none',
              borderRadius: '4px'
            }}
          />
        </div>

        {/* Live Indicator */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500 text-xs font-semibold">LIVE</span>
            </div>
            <span className="text-gray-400 text-xs">Bloomberg TV</span>
          </div>
          <div className="text-gray-500 text-xs">
            Markets & Finance
          </div>
        </div>
      </div>
    </div>
  );
}