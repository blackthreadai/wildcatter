'use client';

import { useState, useEffect } from 'react';

interface SPRData {
  date: string;
  value: number; // millions of barrels
}

export default function SPRChartWidget() {
  const [data, setData] = useState<SPRData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);

  useEffect(() => {
    const fetchSPRData = async () => {
      try {
        console.log('📡 Fetching SPR data from EIA API...');
        const response = await fetch('/api/spr-data');
        const sprData = await response.json();
        
        console.log('📊 SPR API Response:', { 
          current: sprData.current, 
          historical: sprData.historical?.length || 0,
          error: sprData.error 
        });
        
        if (sprData.error || !sprData.historical || sprData.historical.length === 0) {
          console.log('❌ No real SPR data available');
          setData([]);
          setCurrentLevel(null);
        } else {
          console.log('✅ Real SPR data loaded successfully');
          setData(sprData.historical);
          setCurrentLevel(sprData.current);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ Failed to fetch SPR data:', error);
        
        // NO FALLBACK DATA - show empty state
        setData([]);
        setCurrentLevel(null);
        setLoading(false);
      }
    };

    fetchSPRData();
  }, []);

  // Simple SVG line chart
  const renderChart = () => {
    if (data.length === 0) return null;

    const width = 240;
    const height = 120;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const minValue = Math.min(...data.map(d => d.value)) * 0.95;
    const maxValue = Math.max(...data.map(d => d.value)) * 1.05;
    const valueRange = maxValue - minValue;

    // Create path for the line
    const pathData = data.map((point, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y = padding.top + ((maxValue - point.value) / valueRange) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Create fill area path
    const fillPath = pathData + 
      ` L ${padding.left + chartWidth} ${padding.top + chartHeight}` +
      ` L ${padding.left} ${padding.top + chartHeight} Z`;

    return (
      <svg width={width} height={height} className="bg-black">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
        
        {/* Y-axis labels */}
        {[0.25, 0.5, 0.75].map(ratio => {
          const y = padding.top + ratio * chartHeight;
          const value = Math.round(maxValue - ratio * valueRange);
          return (
            <g key={ratio}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#374151" strokeWidth="0.5" opacity="0.3" />
              <text x={padding.left - 5} y={y + 3} fill="#9ca3af" fontSize="8" textAnchor="end">{value}</text>
            </g>
          );
        })}
        
        {/* Chart area fill */}
        <path d={fillPath} fill="#374151" opacity="0.3" />
        
        {/* Chart line */}
        <path d={pathData} fill="none" stroke="#DAA520" strokeWidth="2" />
        
        {/* Data points */}
        {data.map((point, index) => {
          const x = padding.left + (index / (data.length - 1)) * chartWidth;
          const y = padding.top + ((maxValue - point.value) / valueRange) * chartHeight;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill="#DAA520"
              className="hover:r-3 transition-all"
            />
          );
        })}
        
        {/* X-axis */}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#4b5563" strokeWidth="1" />
        
        {/* Current level indicator */}
        {currentLevel && (
          <text x={width / 2} y={height - 5} fill="#DAA520" fontSize="10" textAnchor="middle" fontWeight="bold">
            Current: {currentLevel}M bbls
          </text>
        )}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>STRATEGIC RESERVE</h3>
        </div>
        <div className="flex-1 p-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  const latestData = data[data.length - 1];
  const yearAgoData = data[Math.max(0, data.length - 4)]; // Approximate year ago (quarterly data)
  const change = latestData && yearAgoData ? latestData.value - yearAgoData.value : 0;
  const changePercent = latestData && yearAgoData ? ((change / yearAgoData.value) * 100) : 0;

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>STRATEGIC RESERVE</h3>
      </div>
      <div className="flex-1 p-1 overflow-hidden bg-black">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-400 text-xs font-bold mb-2">EIA API UNAVAILABLE</div>
              <div className="text-gray-500 text-xs">Real SPR data requires EIA API key</div>
              <div className="text-gray-600 text-xs mt-1">Check API configuration</div>
            </div>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="w-full flex justify-center mb-2">
              {renderChart()}
            </div>
        
        {/* Enhanced Stats */}
        {latestData && (
          <div className="space-y-2 px-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Current Level</span>
                <span className="text-[#DAA520] text-xs font-mono font-bold">{latestData.value}M bbls</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Capacity Usage</span>
                <span className="text-white text-xs font-mono">{((latestData.value / 714) * 100).toFixed(0)}% of 714M</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">YoY Change</span>
                <span className={`text-xs font-mono ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}M ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-2">
              <div className="text-[#DAA520] text-xs font-bold mb-1">KEY METRICS</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-400">Import Coverage</div>
                  <div className="text-white font-mono">{Math.round(latestData.value / (7.8 * 30))} days</div>
                </div>
                <div>
                  <div className="text-gray-400">vs Peak (2020)</div>
                  <div className="text-red-400 font-mono">-38%</div>
                </div>
                <div>
                  <div className="text-gray-400">Sites Active</div>
                  <div className="text-white font-mono">4 locations</div>
                </div>
                <div>
                  <div className="text-gray-400">Max Drawdown</div>
                  <div className="text-white font-mono">4.4M bpd</div>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              Source: U.S. Energy Information Administration (REAL-TIME)
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}