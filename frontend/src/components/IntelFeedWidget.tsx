'use client';

import { useState } from 'react';

interface WildcatterButton {
  id: string;
  title: string;
  description: string;
  url: string;
  color: string;
}

export default function WildcatterWidget() {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // Four main buttons from wildcatter.com (excluding terminal)
  const buttons: WildcatterButton[] = [
    {
      id: 'trading',
      title: 'TRADING',
      description: 'Energy Trading Platform',
      url: 'https://wildcatter.com/trading',
      color: '#DAA520'
    },
    {
      id: 'intelligence',
      title: 'INTEL',
      description: 'Market Intelligence',
      url: 'https://wildcatter.com/intelligence',
      color: '#4ade80'
    },
    {
      id: 'analytics',
      title: 'ANALYTICS',
      description: 'Data & Analytics Suite',
      url: 'https://wildcatter.com/analytics',
      color: '#06b6d4'
    },
    {
      id: 'portfolio',
      title: 'PORTFOLIO',
      description: 'Portfolio Management',
      url: 'https://wildcatter.com/portfolio',
      color: '#a855f7'
    }
  ];

  const handleButtonClick = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="h-full w-full bg-black border border-gray-800">
      {/* Header */}
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>WILDCATTER</h3>
      </div>

      {/* Four Buttons Side by Side */}
      <div className="flex-1 p-3">
        <div className="grid grid-cols-4 gap-2 h-full">
          {buttons.map((button) => (
            <button
              key={button.id}
              onClick={() => handleButtonClick(button.url)}
              onMouseEnter={() => setHoveredButton(button.id)}
              onMouseLeave={() => setHoveredButton(null)}
              className="relative bg-gray-900 border border-gray-700 rounded-lg p-3 flex flex-col items-center justify-center hover:border-gray-600 transition-all duration-200 group"
              style={{
                borderColor: hoveredButton === button.id ? button.color : undefined,
                boxShadow: hoveredButton === button.id ? `0 0 10px ${button.color}40` : undefined
              }}
            >
              {/* Button Title */}
              <div 
                className="text-sm font-bold mb-1 transition-colors duration-200"
                style={{
                  color: hoveredButton === button.id ? button.color : '#ffffff'
                }}
              >
                {button.title}
              </div>
              
              {/* Button Description */}
              <div className="text-xs text-gray-400 text-center leading-tight">
                {button.description}
              </div>
              
              {/* Hover Glow Effect */}
              {hoveredButton === button.id && (
                <div 
                  className="absolute inset-0 rounded-lg opacity-10 transition-opacity duration-200"
                  style={{ backgroundColor: button.color }}
                />
              )}
              
              {/* Active Indicator */}
              <div 
                className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-0.5 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: hoveredButton === button.id ? button.color : 'transparent'
                }}
              />
            </button>
          ))}
        </div>
      </div>
      
      {/* Footer with site link */}
      <div className="px-3 pb-2">
        <div className="text-center">
          <a 
            href="https://wildcatter.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#DAA520] text-xs font-bold tracking-wider hover:text-yellow-300 transition-colors"
          >
            WILDCATTER.COM
          </a>
        </div>
      </div>
    </div>
  );
}