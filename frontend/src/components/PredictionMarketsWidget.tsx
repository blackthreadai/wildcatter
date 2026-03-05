'use client';

import { useState, useEffect } from 'react';

interface PredictionMarket {
  id: string;
  question: string;
  probability: number;
  volume: string;
  lastUpdated: string;
  url: string;
  category: string;
  endDate: string;
}

export default function PredictionMarketsWidget() {
  const [predictions, setPredictions] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await fetch('/api/prediction-markets');
        const data = await response.json();
        setPredictions(data.slice(0, 3)); // Show top 3 markets
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch prediction markets:', error);
        
        // Fallback data
        const fallbackPredictions: PredictionMarket[] = [
          {
            id: 'FED-RATES-26',
            question: "Will the Fed cut rates by March 2026?",
            probability: 68,
            volume: "$2.4M",
            lastUpdated: new Date().toISOString(),
            url: 'https://kalshi.com',
            category: 'Economics',
            endDate: '2026-03-15'
          },
          {
            id: 'OIL-80-26',
            question: "Will oil be above $80 by year end?",
            probability: 42,
            volume: "$890K", 
            lastUpdated: new Date().toISOString(),
            url: 'https://kalshi.com',
            category: 'Energy',
            endDate: '2026-12-31'
          },
          {
            id: 'CLIMATE-RECORD',
            question: "Will 2026 be warmest year on record?",
            probability: 35,
            volume: "$1.2M",
            lastUpdated: new Date().toISOString(),
            url: 'https://kalshi.com',
            category: 'Climate',
            endDate: '2026-12-31'
          }
        ];
        
        setPredictions(fallbackPredictions);
        setLoading(false);
      }
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return '#22c55e'; // green
    if (probability >= 50) return '#DAA520'; // gold
    if (probability >= 30) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Updated now';
    if (diffHours === 1) return 'Updated 1h ago';
    return `Updated ${diffHours}h ago`;
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-semibold tracking-wider">PREDICTION MARKETS</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-black border border-gray-700 min-h-[400px] max-h-[500px]">
      <div className="bg-gray-800 p-2 flex-shrink-0 flex items-center justify-between">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>PREDICTION MARKETS</h3>
        <div className="text-[#DAA520] text-xs font-bold">KALSHI</div>
      </div>
      
      <div className="flex-1 bg-black p-3 space-y-3 overflow-y-auto">
        {predictions.slice(0, 3).map((prediction, i) => (
          <div key={prediction.id} className="bg-gray-900 rounded-lg border border-gray-700 hover:border-[#DAA520] transition-all duration-200">
            <a 
              href={prediction.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block p-3 hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              {/* Header with category and probability */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider px-2 py-1 bg-gray-800 rounded">
                  {prediction.category}
                </span>
                <div className="flex items-center gap-2">
                  <div 
                    className="text-lg font-bold px-2 py-1 rounded"
                    style={{ 
                      color: getProbabilityColor(prediction.probability),
                      backgroundColor: `${getProbabilityColor(prediction.probability)}20`
                    }}
                  >
                    {Math.round(prediction.probability)}%
                  </div>
                </div>
              </div>
              
              {/* Question */}
              <div className="text-white text-sm font-medium mb-2 leading-tight">
                {prediction.question}
              </div>
              
              {/* Stats row */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="text-gray-400">
                    Volume: <span className="text-[#DAA520] font-mono">{prediction.volume}</span>
                  </div>
                  <div className="text-gray-400">
                    Ends: <span className="text-white">{new Date(prediction.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-gray-500">
                  {formatTime(prediction.lastUpdated)}
                </div>
              </div>
              
              {/* External link indicator */}
              <div className="flex items-center justify-end mt-2">
                <div className="text-[#DAA520] text-xs flex items-center gap-1">
                  <span>Trade on Kalshi</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}