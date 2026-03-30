'use client';

import { useState, useEffect } from 'react';

interface FuturesContract {
  symbol: string;
  expiry: string;
  price: number;
  change: number;
  volume: number;
  openInterest: number;
  lastUpdated: string;
}

interface FuturesCurve {
  commodity: 'WTI Crude' | 'Brent Crude' | 'RBOB Gasoline' | 'Heating Oil' | 'Natural Gas';
  unit: string;
  contracts: FuturesContract[];
  contango: boolean;
  curveSlope: number;
  lastUpdated: string;
}

interface EnergyFuturesData {
  curves: FuturesCurve[];
  marketSentiment: {
    oilSentiment: 'Bullish' | 'Bearish' | 'Neutral';
    gasSentiment: 'Bullish' | 'Bearish' | 'Neutral';
    refinedSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  };
  lastUpdated: string;
}

export default function EnergyFuturesWidget() {
  const [data, setData] = useState<EnergyFuturesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCurve, setSelectedCurve] = useState<string>('WTI Crude');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/energy-futures');
        const futuresData = await response.json();
        setData(futuresData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch energy futures data:', error);
        
        // NO FALLBACK DATA - show empty state when real data unavailable
        setData(null);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000); // Update every 15 minutes
    return () => clearInterval(interval);
  }, []);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish': return 'text-green-500';
      case 'Bearish': return 'text-red-500';
      case 'Neutral': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish': return '📈';
      case 'Bearish': return '📉';
      case 'Neutral': return '➡️';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>ENERGY FUTURES</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data || data.curves.length === 0) {
    return (
      <div className="w-full flex flex-col bg-black h-full">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>ENERGY FUTURES</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-center">
            <div className="text-red-400 text-xs font-bold mb-2">ALPHA VANTAGE API UNAVAILABLE</div>
            <div className="text-gray-500 text-xs">Real futures data requires Alpha Vantage API</div>
            <div className="text-gray-600 text-xs mt-1">Check API connection</div>
          </div>
        </div>
      </div>
    );
  }

  const activeCurve = data.curves.find(c => c.commodity === selectedCurve) || data.curves[0];

  return (
    <div className="w-full flex flex-col bg-black h-full">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>ENERGY FUTURES</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto min-h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#4a5568 #1a202c" }}>
        {/* Market Sentiment */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">MARKET SENTIMENT</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-400">Oil</div>
              <div className={`font-medium ${getSentimentColor(data.marketSentiment.oilSentiment)}`}>
                {getSentimentIcon(data.marketSentiment.oilSentiment)} {data.marketSentiment.oilSentiment}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Gas</div>
              <div className={`font-medium ${getSentimentColor(data.marketSentiment.gasSentiment)}`}>
                {getSentimentIcon(data.marketSentiment.gasSentiment)} {data.marketSentiment.gasSentiment}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Refined</div>
              <div className={`font-medium ${getSentimentColor(data.marketSentiment.refinedSentiment)}`}>
                {getSentimentIcon(data.marketSentiment.refinedSentiment)} {data.marketSentiment.refinedSentiment}
              </div>
            </div>
          </div>
        </div>

        {/* Curve Selector */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1 text-xs">
            {data.curves.map((curve, i) => (
              <button
                key={i}
                onClick={() => setSelectedCurve(curve.commodity)}
                className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
                  selectedCurve === curve.commodity
                    ? 'bg-[#DAA520] text-black border-[#DAA520]'
                    : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-gray-500'
                }`}
              >
                {curve.commodity}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Curve Info */}
        {activeCurve && (
          <div className="mb-3 pb-2 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white text-xs font-medium">{activeCurve.commodity}</div>
              <div className="text-white text-xs font-bold">
                ${activeCurve.contracts[0]?.price?.toFixed(2) || 'N/A'} 
                <span className="text-gray-400 ml-1">{activeCurve.unit?.replace('$', '')}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div>
                <div className="text-gray-400">Curve Structure</div>
                <div className={`font-medium ${activeCurve.contango ? 'text-red-400' : 'text-green-400'}`}>
                  {activeCurve.contango ? 'Contango' : 'Backwardation'}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Slope</div>
                <div className={`font-medium ${activeCurve.curveSlope > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {activeCurve.curveSlope > 0 ? '+' : ''}{activeCurve.curveSlope.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Front Month Contracts */}
        <div>
          <div className="text-[#DAA520] text-xs font-bold mb-2">FRONT CONTRACTS</div>
          {activeCurve?.contracts.slice(0, 6).map((contract, i) => (
            <div key={i} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-white text-xs font-medium">{contract.expiry}</div>
                <div className="text-white text-xs font-bold">
                  ${contract.price ? contract.price.toFixed(2) : 'N/A'}
                  <span className="text-gray-400 text-xs ml-1">
                    {activeCurve.commodity === 'WTI Crude' || activeCurve.commodity === 'Brent Crude' ? '/bbl' :
                     activeCurve.commodity === 'RBOB Gasoline' || activeCurve.commodity === 'Heating Oil' ? '/gal' :
                     activeCurve.commodity === 'Natural Gas' ? '/MMBtu' : ''}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-400">
                  Vol: {(contract.volume / 1000).toFixed(0)}K
                </div>
                <div className={`font-medium ${
                  contract.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {contract.change >= 0 ? '+' : ''}{contract.change.toFixed(2)}
                </div>
              </div>
              
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}