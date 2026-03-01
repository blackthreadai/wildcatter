'use client';

import { useState, useEffect } from 'react';

interface GreedFearData {
  value: number;
  label: string;
  change: number;
}

export default function GreedFearWidget() {
  const [data, setData] = useState<GreedFearData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGreedFearData = async () => {
      try {
        // Mock data - in production, this would fetch from Fear & Greed API
        const mockValue = Math.floor(Math.random() * 100);
        const mockChange = (Math.random() - 0.5) * 10;
        
        let label = '';
        if (mockValue <= 25) label = 'EXTREME FEAR';
        else if (mockValue <= 45) label = 'FEAR';
        else if (mockValue <= 55) label = 'NEUTRAL';
        else if (mockValue <= 75) label = 'GREED';
        else label = 'EXTREME GREED';

        setData({
          value: mockValue,
          label,
          change: mockChange
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch greed/fear data:', error);
        // Fallback data
        setData({
          value: 42,
          label: 'FEAR',
          change: -2.3
        });
        setLoading(false);
      }
    };

    fetchGreedFearData();
    const interval = setInterval(fetchGreedFearData, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getColor = (value: number) => {
    if (value <= 25) return '#ef4444'; // red-500
    if (value <= 45) return '#f97316'; // orange-500
    if (value <= 55) return '#DAA520'; // gold
    if (value <= 75) return '#84cc16'; // lime-500
    return '#22c55e'; // green-500
  };

  const getBarWidth = (value: number) => {
    return `${value}%`;
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black max-h-full">
        <div className="bg-gray-800 p-2">
          <h3 className="text-white text-xs font-semibold tracking-wider">FEAR & GREED</h3>
        </div>
        <div className="flex-1 p-2 flex items-center justify-center bg-black">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full w-full flex flex-col bg-black max-h-full">
        <div className="bg-gray-800 p-2">
          <h3 className="text-white text-xs font-semibold tracking-wider">FEAR & GREED</h3>
        </div>
        <div className="flex-1 p-2 flex items-center justify-center bg-black">
          <div className="text-gray-500 text-xs">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-black max-h-full">
      <div className="bg-gray-800 p-2">
        <h3 className="text-white text-xs font-semibold tracking-wider">FEAR & GREED</h3>
      </div>
      
      <div className="flex-1 p-2 flex flex-col justify-center bg-black">
        {/* Main Value */}
        <div className="text-center mb-3">
          <div 
            className="text-2xl font-bold mb-1"
            style={{ color: getColor(data.value) }}
          >
            {data.value}
          </div>
          <div 
            className="text-xs font-semibold tracking-wider"
            style={{ color: getColor(data.value) }}
          >
            {data.label}
          </div>
        </div>

        {/* Gauge Bar */}
        <div className="mb-3">
          <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000"
              style={{ 
                width: getBarWidth(data.value),
                backgroundColor: getColor(data.value)
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Change Indicator */}
        <div className="text-center">
          <span className={`text-xs ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.change >= 0 ? '+' : ''}{data.change.toFixed(1)}
          </span>
          <span className="text-gray-500 text-xs ml-1">24h</span>
        </div>
      </div>
    </div>
  );
}