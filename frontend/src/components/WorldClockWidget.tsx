'use client';

import { useState, useEffect } from 'react';

interface CityTime {
  city: string;
  timezone: string;
  time: string;
  date: string;
}

export default function WorldClockWidget() {
  const [cityTimes, setCityTimes] = useState<CityTime[]>([]);
  const [loading, setLoading] = useState(true);

  const cities = [
    { city: 'Chicago', timezone: 'America/Chicago' },
    { city: 'London', timezone: 'Europe/London' },
    { city: 'Moscow', timezone: 'Europe/Moscow' },
    { city: 'Beijing', timezone: 'Asia/Shanghai' }
  ];

  const updateTimes = () => {
    const times = cities.map(({ city, timezone }) => {
      const now = new Date();
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        month: 'short',
        day: 'numeric'
      };
      
      return {
        city,
        timezone,
        time: now.toLocaleTimeString('en-US', timeOptions),
        date: now.toLocaleDateString('en-US', dateOptions)
      };
    });
    
    setCityTimes(times);
    setLoading(false);
  };

  useEffect(() => {
    updateTimes();
    const interval = setInterval(updateTimes, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-semibold tracking-wider">WORLD CLOCK</h3>
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
        <h3 className="text-white text-xs font-semibold tracking-wider">WORLD CLOCK</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-1">
        {cityTimes.map((cityTime, i) => (
          <div key={cityTime.city} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="text-[#DAA520] text-xs font-semibold">{cityTime.city}</div>
              <div className="text-gray-400 text-xs">{cityTime.date}</div>
            </div>
            <div className="text-right ml-1">
              <div className="text-white text-xs font-mono">{cityTime.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}