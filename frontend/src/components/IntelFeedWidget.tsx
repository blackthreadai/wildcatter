'use client';

import { useState, useEffect } from 'react';

interface IntelItem {
  id: string;
  type: 'ALERT' | 'UPDATE' | 'BRIEFING' | 'ANALYSIS';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  timestamp: string;
  source: string;
}

export default function IntelFeedWidget() {
  const [intelItems, setIntelItems] = useState<IntelItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Mock intelligence feed data
    const mockIntel: IntelItem[] = [
      {
        id: '1',
        type: 'ALERT',
        priority: 'HIGH',
        title: 'Geopolitical tensions escalate in key energy corridor - supply chain monitoring active',
        timestamp: '14:32',
        source: 'INTEL-7'
      },
      {
        id: '2', 
        type: 'BRIEFING',
        priority: 'MEDIUM',
        title: 'Strategic petroleum reserve movements detected across three major facilities',
        timestamp: '13:45',
        source: 'SENTRY-2'
      },
      {
        id: '3',
        type: 'UPDATE',
        priority: 'HIGH',
        title: 'Cyber threat assessment: critical infrastructure monitoring protocols engaged',
        timestamp: '12:58',
        source: 'WATCHDOG-5'
      },
      {
        id: '4',
        type: 'ANALYSIS',
        priority: 'MEDIUM',
        title: 'Market manipulation indicators detected in crude futures - algorithmic trading patterns',
        timestamp: '12:15',
        source: 'QUANTUM-1'
      }
    ];

    setIntelItems(mockIntel);

    // Auto-rotate every 8 seconds
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % mockIntel.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  if (intelItems.length === 0) {
    return (
      <div className="h-full w-full bg-black border border-gray-800">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>INTEL FEED</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-3">
          <div className="text-gray-500 text-xs">Initializing...</div>
        </div>
      </div>
    );
  }

  const currentItem = intelItems[currentIndex];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-[#DAA520]';
      case 'LOW': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ALERT': return 'text-red-400';
      case 'BRIEFING': return 'text-blue-400';
      case 'UPDATE': return 'text-green-400';
      case 'ANALYSIS': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full w-full bg-black border border-gray-800">
      {/* Header */}
      <div className="bg-gray-800 p-2 flex-shrink-0 flex items-center justify-between">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>INTEL FEED</h3>
        <div className="flex items-center gap-2">
          <div className={`text-xs font-bold tracking-wider ${getPriorityColor(currentItem.priority)}`}>
            {currentItem.priority}
          </div>
          <div className={`text-xs font-medium ${getTypeColor(currentItem.type)}`}>
            {currentItem.type}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div className="flex-1 flex items-center">
          <p className="text-white text-sm leading-tight font-medium tracking-[0.05em]" style={{ fontStretch: 'condensed' }}>
            {currentItem.title}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="text-[#DAA520] text-xs font-bold">
              {currentItem.source}
            </span>
            <span className="text-gray-400 text-xs">
              {currentItem.timestamp}
            </span>
          </div>
          
          <div className="flex gap-1">
            {intelItems.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 ${
                  index === currentIndex ? 'bg-[#DAA520]' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}