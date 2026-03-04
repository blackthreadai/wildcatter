'use client';

import { useState, useEffect } from 'react';

interface TimeZone {
  name: string;
  zone: string;
  time: string;
}

export default function WorldClockWidget() {
  const [times, setTimes] = useState<TimeZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      
      // 4 key energy markets time zones
      const timeZones = [
        { name: 'CHICAGO', zone: 'America/Chicago' },
        { name: 'LONDON', zone: 'Europe/London' },
        { name: 'BEIJING', zone: 'Asia/Shanghai' },
        { name: 'RIYADH', zone: 'Asia/Riyadh' }
      ];

      const newTimes = timeZones.map(tz => ({
        ...tz,
        time: new Intl.DateTimeFormat('en-US', {
          timeZone: tz.zone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }).format(now)
      }));

      setTimes(newTimes);
      setLoading(false);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>WORLD CLOCK</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>WORLD CLOCK</h3>
      </div>
      
      <div className="flex-1 bg-black p-2">
        {/* 2x2 Grid Layout for 4 key energy markets */}
        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
          {times.map((timeData, i) => (
            <div key={timeData.name} className="flex flex-col items-center justify-center">
              {/* LED-style time display */}
              <div 
                className="text-red-500 font-mono font-bold text-lg mb-1 tracking-wider"
                style={{ 
                  fontFamily: 'monospace',
                  textShadow: '0 0 8px #ef4444',
                  fontSize: '1.6rem'
                }}
              >
                {timeData.time}
              </div>
              {/* Zone label */}
              <div 
                className="text-white text-xs font-bold tracking-wider"
                style={{ 
                  fontStretch: 'condensed',
                  fontSize: '0.65rem'
                }}
              >
                {timeData.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}