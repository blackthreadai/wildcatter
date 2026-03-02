'use client';

import { useState, useEffect } from 'react';

interface Prediction {
  question: string;
  probability: number;
  volume: string;
  lastUpdated: string;
}

export default function PredictionMarketsWidget() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        // Mock Polymarket-style energy predictions
        const mockPredictions: Prediction[] = [
          {
            question: "Oil above $80 by March 2026?",
            probability: 68,
            volume: "$2.4M",
            lastUpdated: "2026-02-21T16:30:00Z"
          },
          {
            question: "US gas reserves increase Q1 2026?",
            probability: 42,
            volume: "$890K", 
            lastUpdated: "2026-02-21T14:15:00Z"
          },
          {
            question: "New oil field discovered this year?",
            probability: 35,
            volume: "$1.2M",
            lastUpdated: "2026-02-21T13:45:00Z"
          }
        ];

        // Add some randomization to probabilities
        const randomizedPredictions = mockPredictions.map(pred => ({
          ...pred,
          probability: Math.max(5, Math.min(95, pred.probability + (Math.random() - 0.5) * 10))
        }));

        setPredictions(randomizedPredictions);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch prediction data:', error);
        setLoading(false);
      }
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 2 * 60 * 1000); // Update every 2 minutes
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
      <div className="h-full w-full flex flex-col bg-black">
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
    <div className="h-full w-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-semibold tracking-wider">PREDICTION MARKETS</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-1 overflow-y-auto">
        {predictions.slice(0, 3).map((prediction, i) => (
          <div key={i} className="border-b border-gray-700 pb-1 mb-1 last:border-b-0 last:mb-0">
            <div className="mb-1">
              <div className="text-[#DAA520] text-xs font-semibold mb-1">{prediction.question}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="text-xs font-bold"
                    style={{ color: getProbabilityColor(prediction.probability) }}
                  >
                    {Math.round(prediction.probability)}%
                  </div>
                  <div className="text-gray-500 text-xs">Vol: {prediction.volume}</div>
                </div>
                <div className="text-gray-500 text-xs">
                  {formatTime(prediction.lastUpdated)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}