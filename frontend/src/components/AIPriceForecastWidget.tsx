'use client';

import { useState, useEffect } from 'react';

interface PriceForecast {
  instrument: string;
  currentPrice: number;
  currency: string;
  unit: string;
  forecasts: {
    period: '7-day' | '30-day';
    targetPrice: number;
    confidence: number;
    direction: 'Bullish' | 'Bearish' | 'Neutral';
    priceChange: number;
    percentChange: number;
    keyFactors: string[];
    riskLevel: 'Low' | 'Medium' | 'High';
  }[];
  technicalSignals: {
    rsi: number;
    macd: 'Bullish' | 'Bearish' | 'Neutral';
    movingAverage: 'Above' | 'Below' | 'At';
    support: number;
    resistance: number;
  };
  lastUpdated: string;
}

interface AIPriceForecastData {
  forecasts: PriceForecast[];
  modelMetrics: {
    modelName: string;
    accuracy: number;
    lastUpdate: string;
    version: string;
    trainingPeriod: string;
    features: string[];
  }[];
  marketConditions: {
    volatility: 'Low' | 'Medium' | 'High' | 'Extreme';
    trendStrength: number;
    marketRegime: 'Trending' | 'Mean Reverting' | 'Volatile' | 'Consolidating';
    forecastReliability: 'High' | 'Medium' | 'Low';
  };
  disclaimers: string[];
  lastUpdated: string;
}

export default function AIPriceForecastWidget() {
  const [data, setData] = useState<AIPriceForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'forecasts' | 'models' | 'conditions'>('forecasts');
  const [selectedInstrument, setSelectedInstrument] = useState<string>('WTI Crude Oil');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/ai-price-forecast');
        const forecastData = await response.json();
        setData(forecastData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch AI price forecast data:', error);
        
        // Fallback data
        const fallbackData: AIPriceForecastData = {
          forecasts: [
            {
              instrument: 'WTI Crude Oil',
              currentPrice: 73.45,
              currency: 'USD',
              unit: '$/barrel',
              forecasts: [
                {
                  period: '7-day',
                  targetPrice: 75.20,
                  confidence: 78,
                  direction: 'Bullish',
                  priceChange: 1.75,
                  percentChange: 2.4,
                  keyFactors: ['Technical momentum', 'Supply constraints'],
                  riskLevel: 'Medium'
                }
              ],
              technicalSignals: {
                rsi: 55,
                macd: 'Bullish',
                movingAverage: 'Above',
                support: 71.20,
                resistance: 76.80
              },
              lastUpdated: new Date().toISOString()
            }
          ],
          modelMetrics: [
            {
              modelName: 'Energy Price Neural Network v3.2',
              accuracy: 68.5,
              lastUpdate: new Date().toISOString(),
              version: '3.2.1',
              trainingPeriod: '2019-2024',
              features: ['Technical indicators', 'Fundamentals']
            }
          ],
          marketConditions: {
            volatility: 'Medium',
            trendStrength: 62,
            marketRegime: 'Consolidating',
            forecastReliability: 'Medium'
          },
          disclaimers: [
            'AI forecasts are for informational purposes only'
          ],
          lastUpdated: new Date().toISOString()
        };
        
        setData(fallbackData);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4 * 60 * 60 * 1000); // Update every 4 hours
    return () => clearInterval(interval);
  }, []);

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'Bullish': return 'text-green-500';
      case 'Bearish': return 'text-red-500';
      case 'Neutral': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-500';
      case 'Medium': return 'text-yellow-500';
      case 'High': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Low':
      case 'High':
        return 'text-green-500';
      case 'Medium':
        return 'text-yellow-500';
      case 'Extreme':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>AI PRICE FORECAST</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full w-full flex flex-col bg-black">
        <div className="bg-gray-800 p-2 flex-shrink-0">
          <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>AI PRICE FORECAST</h3>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center justify-center bg-black min-h-0">
          <div className="text-gray-500 text-xs">No data available</div>
        </div>
      </div>
    );
  }

  const activeForecast = data.forecasts.find(f => f.instrument === selectedInstrument) || data.forecasts[0];

  return (
    <div className="h-full w-full flex flex-col bg-black">
      <div className="bg-gray-800 p-2 flex-shrink-0">
        <h3 className="text-white text-xs font-bold tracking-[0.2em]" style={{ fontStretch: 'condensed' }}>AI PRICE FORECAST</h3>
      </div>
      
      <div className="flex-1 bg-black px-3 py-2 overflow-y-auto">
        {/* Market Conditions */}
        <div className="mb-3 pb-2 border-b border-gray-700">
          <div className="text-[#DAA520] text-xs font-bold mb-2">MARKET CONDITIONS</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-400">Volatility</div>
              <div className={`font-bold ${getConditionColor(data.marketConditions.volatility)}`}>
                {data.marketConditions.volatility}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Reliability</div>
              <div className={`font-bold ${getConditionColor(data.marketConditions.forecastReliability)}`}>
                {data.marketConditions.forecastReliability}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Regime</div>
              <div className="text-white font-medium">{data.marketConditions.marketRegime}</div>
            </div>
            <div>
              <div className="text-gray-400">Trend Strength</div>
              <div className="text-[#DAA520] font-medium">{data.marketConditions.trendStrength.toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mb-3">
          <div className="flex gap-1 text-xs">
            {[
              { id: 'forecasts', label: 'Forecasts' },
              { id: 'models', label: 'Models' },
              { id: 'conditions', label: 'Technical' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2 py-1 rounded border transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#DAA520] text-black border-[#DAA520]'
                    : 'bg-gray-800 text-gray-300 border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'forecasts' && (
          <div>
            {/* Instrument Selector */}
            <div className="mb-3">
              <select
                value={selectedInstrument}
                onChange={(e) => setSelectedInstrument(e.target.value)}
                className="w-full px-2 py-1 bg-gray-800 text-white text-xs border border-gray-600 rounded"
              >
                {data.forecasts.map((forecast, i) => (
                  <option key={i} value={forecast.instrument}>
                    {forecast.instrument}
                  </option>
                ))}
              </select>
            </div>

            {activeForecast && (
              <div>
                {/* Current Price */}
                <div className="mb-3 pb-2 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-white text-xs font-medium">{activeForecast.instrument}</div>
                    <div className="text-white text-xs font-bold">
                      {activeForecast.currentPrice.toFixed(2)} {activeForecast.unit}
                    </div>
                  </div>
                </div>

                {/* Forecasts */}
                <div className="space-y-3">
                  {activeForecast.forecasts.map((forecast, i) => (
                    <div key={i} className="pb-3 border-b border-gray-700 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[#DAA520] text-xs font-bold">{forecast.period.toUpperCase()}</div>
                        <div className="text-right">
                          <div className="text-white text-xs font-bold">
                            {forecast.targetPrice.toFixed(2)}
                          </div>
                          <div className={`text-xs font-medium ${
                            forecast.priceChange >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {forecast.priceChange >= 0 ? '+' : ''}{forecast.priceChange.toFixed(2)} 
                            ({forecast.percentChange >= 0 ? '+' : ''}{forecast.percentChange.toFixed(1)}%)
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div>
                          <div className="text-gray-400">Direction</div>
                          <div className={`font-medium ${getDirectionColor(forecast.direction)}`}>
                            {forecast.direction}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400">Confidence</div>
                          <div className="text-white font-medium">{forecast.confidence.toFixed(0)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Risk</div>
                          <div className={`font-medium ${getRiskColor(forecast.riskLevel)}`}>
                            {forecast.riskLevel}
                          </div>
                        </div>
                      </div>

                      {/* Key Factors */}
                      <div className="text-xs">
                        <div className="text-gray-400 mb-1">Key Factors:</div>
                        <div className="space-y-1">
                          {forecast.keyFactors.slice(0, 3).map((factor, j) => (
                            <div key={j} className="text-gray-300">• {factor}</div>
                          ))}
                        </div>
                      </div>

                      {/* Confidence Bar */}
                      <div className="mt-2">
                        <div className="bg-gray-700 rounded-full h-1">
                          <div 
                            className="bg-[#DAA520] h-1 rounded-full"
                            style={{ width: `${forecast.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-3">
            {data.modelMetrics.map((model, i) => (
              <div key={i} className="pb-3 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white text-xs font-medium">{model.modelName}</div>
                  <div className="text-right">
                    <div className="text-[#DAA520] text-xs font-bold">
                      {model.accuracy.toFixed(1)}% Accuracy
                    </div>
                    <div className="text-gray-400 text-xs">v{model.version}</div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 mb-2">
                  Training Period: {model.trainingPeriod}
                </div>

                <div className="text-xs">
                  <div className="text-gray-400 mb-1">Key Features:</div>
                  <div className="space-y-1">
                    {model.features.slice(0, 3).map((feature, j) => (
                      <div key={j} className="text-gray-300">• {feature}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'conditions' && activeForecast && (
          <div>
            <div className="text-[#DAA520] text-xs font-bold mb-3">TECHNICAL SIGNALS</div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-400">RSI</div>
                  <div className="text-white font-bold">{activeForecast.technicalSignals.rsi.toFixed(0)}</div>
                </div>
                <div>
                  <div className="text-gray-400">MACD</div>
                  <div className={`font-medium ${getDirectionColor(activeForecast.technicalSignals.macd)}`}>
                    {activeForecast.technicalSignals.macd}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Moving Average</div>
                  <div className={`font-medium ${
                    activeForecast.technicalSignals.movingAverage === 'Above' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {activeForecast.technicalSignals.movingAverage}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Price vs MA</div>
                  <div className="text-white font-medium">
                    {activeForecast.technicalSignals.movingAverage} MA
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Support</div>
                    <div className="text-green-500 font-bold">
                      {activeForecast.technicalSignals.support.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Resistance</div>
                    <div className="text-red-500 font-bold">
                      {activeForecast.technicalSignals.resistance.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-3 pt-2 border-t border-gray-700">
          <div className="text-yellow-500 text-xs font-bold mb-1">⚠️ DISCLAIMER</div>
          <div className="text-gray-400 text-xs">
            {data.disclaimers[0] || 'AI forecasts are for informational purposes only'}
          </div>
        </div>
      </div>
    </div>
  );
}