'use client';

import { useState, useEffect } from 'react';

interface TimeZone {
  name: string;
  zone: string;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function WorldClockWidget() {
  const [times, setTimes] = useState<TimeZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      
      // 6 key global time zones
      const timeZones = [
        { name: 'CHICAGO', zone: 'America/Chicago' },
        { name: 'LONDON', zone: 'Europe/London' },
        { name: 'MOSCOW', zone: 'Europe/Moscow' },
        { name: 'TOKYO', zone: 'Asia/Tokyo' },
        { name: 'BEIJING', zone: 'Asia/Shanghai' },
        { name: 'RIYADH', zone: 'Asia/Riyadh' }
      ];

      const newTimes = timeZones.map(tz => {
        // Get the time in the specific timezone
        const timeInZone = new Date(now.toLocaleString("en-US", {timeZone: tz.zone}));
        
        return {
          ...tz,
          hours: timeInZone.getHours(),
          minutes: timeInZone.getMinutes(),
          seconds: timeInZone.getSeconds()
        };
      });

      setTimes(newTimes);
      setLoading(false);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  const createAnalogClock = (time: TimeZone) => {
    // Calculate angles for hands (12 o'clock is 0 degrees, rotating clockwise)
    const secondAngle = (time.seconds * 6) - 90; // 6 degrees per second
    const minuteAngle = (time.minutes * 6 + time.seconds * 0.1) - 90; // 6 degrees per minute
    const hourAngle = ((time.hours % 12) * 30 + time.minutes * 0.5) - 90; // 30 degrees per hour
    
    const centerX = 30;
    const centerY = 30;
    const clockRadius = 28;
    
    // Determine AM/PM color
    const isAM = time.hours < 12;
    const clockColor = isAM ? '#22c55e' : '#ef4444'; // Green for AM, Red for PM
    const amPmText = isAM ? 'AM' : 'PM';
    
    return (
      <div className="flex flex-col items-center">
        <svg width="60" height="60" className="mb-1">
          {/* Clock face */}
          <circle
            cx={centerX}
            cy={centerY}
            r={clockRadius}
            fill="black"
            stroke={clockColor}
            strokeWidth="2"
          />
          
          {/* Hour markers */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30) - 90;
            const x1 = centerX + (clockRadius - 5) * Math.cos(angle * Math.PI / 180);
            const y1 = centerY + (clockRadius - 5) * Math.sin(angle * Math.PI / 180);
            const x2 = centerX + (clockRadius - 2) * Math.cos(angle * Math.PI / 180);
            const y2 = centerY + (clockRadius - 2) * Math.sin(angle * Math.PI / 180);
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={clockColor}
                strokeWidth="1.5"
              />
            );
          })}
          
          {/* Hour hand */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX + 18 * Math.cos(hourAngle * Math.PI / 180)}
            y2={centerY + 18 * Math.sin(hourAngle * Math.PI / 180)}
            stroke={clockColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Minute hand */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX + 26 * Math.cos(minuteAngle * Math.PI / 180)}
            y2={centerY + 26 * Math.sin(minuteAngle * Math.PI / 180)}
            stroke={clockColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Second hand */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX + 28 * Math.cos(secondAngle * Math.PI / 180)}
            y2={centerY + 28 * Math.sin(secondAngle * Math.PI / 180)}
            stroke="#ef4444"
            strokeWidth="1"
            strokeLinecap="round"
          />
          
          {/* Center dot */}
          <circle
            cx={centerX}
            cy={centerY}
            r="3"
            fill="#DAA520"
          />
        </svg>
        
        {/* City name and AM/PM */}
        <div className="text-center">
          <div className="text-white text-xs font-bold tracking-wider">
            {time.name}
          </div>
          <div className={`text-xs font-bold ${isAM ? 'text-green-500' : 'text-red-500'}`}>
            {amPmText}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 h-full">
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
    <div className="w-full flex flex-col bg-black border border-gray-700 h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>WORLD CLOCK</h3>
      </div>
      
      <div className="flex-1 bg-black p-2 flex items-center justify-center">
        {/* 2x3 Grid for 6 analog clocks with even spacing */}
        <div className="grid grid-cols-2 grid-rows-3 gap-4 h-full w-full justify-items-center items-center">
          {times.map((timeData) => (
            <div key={timeData.name} className="flex items-center justify-center">
              {createAnalogClock(timeData)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}