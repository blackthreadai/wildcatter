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
        setPredictions(data); // Show all energy/geopolitical markets
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch prediction markets:', error);
        // No fallback data per no-mock-data policy - show empty state
        setPredictions([]);
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
      <div className="w-full bg-black border border-gray-700">
        <div className="bg-gray-800 p-2">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>PREDICTION MARKETS</h3>
        </div>
        <div className="bg-black p-3 space-y-3" style={{ height: '500px', overflowY: 'scroll', scrollbarWidth: 'thin', scrollbarColor: '#4a5568 #1a202c' }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-xs">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black border border-gray-700">
      <div className="bg-gray-800 p-2">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>PREDICTION MARKETS</h3>
      </div>
      
      <div className="bg-black p-3 space-y-3" style={{ height: '500px', overflowY: 'scroll', scrollbarWidth: 'thin', scrollbarColor: '#4a5568 #1a202c' }}>
        {predictions.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center">
              <div className="text-gray-500 text-sm mb-2">No current energy markets</div>
              <div className="text-gray-600 text-xs">
                Looking for active energy & geopolitical events
              </div>
              <div className="text-[#DAA520] text-xs mt-2">
                Future markets only • No historical data
              </div>
            </div>
          </div>
        ) : (
          predictions.map((prediction, i) => (
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
                  <span>Trade on Polymarket</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </div>
            </a>
          </div>
          ))
        )}
      </div>
    </div>
  );
}