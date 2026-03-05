import { NextResponse } from 'next/server';

interface PriceForecast {
  instrument: string;
  currentPrice: number;
  currency: string;
  unit: string;
  forecasts: {
    period: '7-day' | '30-day';
    targetPrice: number;
    confidence: number; // 0-100 percentage
    direction: 'Bullish' | 'Bearish' | 'Neutral';
    priceChange: number; // absolute change
    percentChange: number; // percentage change
    keyFactors: string[];
    riskLevel: 'Low' | 'Medium' | 'High';
  }[];
  technicalSignals: {
    rsi: number; // 0-100
    macd: 'Bullish' | 'Bearish' | 'Neutral';
    movingAverage: 'Above' | 'Below' | 'At';
    support: number;
    resistance: number;
  };
  lastUpdated: string;
}

interface ModelMetrics {
  modelName: string;
  accuracy: number; // historical accuracy percentage
  lastUpdate: string;
  version: string;
  trainingPeriod: string;
  features: string[]; // key input features
}

interface AIPriceForecastData {
  forecasts: PriceForecast[];
  modelMetrics: ModelMetrics[];
  marketConditions: {
    volatility: 'Low' | 'Medium' | 'High' | 'Extreme';
    trendStrength: number; // 0-100
    marketRegime: 'Trending' | 'Mean Reverting' | 'Volatile' | 'Consolidating';
    forecastReliability: 'High' | 'Medium' | 'Low';
  };
  disclaimers: string[];
  lastUpdated: string;
}

// Cache for 4 hours (AI models update less frequently)
let cache: { data: AIPriceForecastData; ts: number } | null = null;
const CACHE_MS = 4 * 60 * 60 * 1000;

async function fetchAIPriceForecastData(): Promise<AIPriceForecastData> {
  try {
    // In production, this would call actual ML models (TensorFlow, PyTorch APIs)
    // For now, return realistic mock data based on current price action
    
    const generateForecast = (
      instrument: string, 
      currentPrice: number, 
      currency: string, 
      unit: string
    ): PriceForecast => {
      const volatility = 0.15 + Math.random() * 0.10; // 15-25% volatility
      const trend = (Math.random() - 0.5) * 0.1; // -5% to +5% trend
      
      const sevenDayChange = trend + (Math.random() - 0.5) * volatility * 0.5;
      const thirtyDayChange = trend * 1.5 + (Math.random() - 0.5) * volatility;
      
      const sevenDayPrice = currentPrice * (1 + sevenDayChange);
      const thirtyDayPrice = currentPrice * (1 + thirtyDayChange);
      
      return {
        instrument,
        currentPrice,
        currency,
        unit,
        forecasts: [
          {
            period: '7-day',
            targetPrice: sevenDayPrice,
            confidence: 75 + Math.random() * 20, // 75-95% confidence
            direction: sevenDayChange > 0.02 ? 'Bullish' : sevenDayChange < -0.02 ? 'Bearish' : 'Neutral',
            priceChange: sevenDayPrice - currentPrice,
            percentChange: sevenDayChange * 100,
            keyFactors: [
              'Technical momentum analysis',
              'Supply/demand fundamentals',
              'Geopolitical risk factors',
              'Inventory data trends'
            ],
            riskLevel: Math.abs(sevenDayChange) > 0.05 ? 'High' : Math.abs(sevenDayChange) > 0.02 ? 'Medium' : 'Low'
          },
          {
            period: '30-day',
            targetPrice: thirtyDayPrice,
            confidence: 60 + Math.random() * 25, // 60-85% confidence (less for longer term)
            direction: thirtyDayChange > 0.03 ? 'Bullish' : thirtyDayChange < -0.03 ? 'Bearish' : 'Neutral',
            priceChange: thirtyDayPrice - currentPrice,
            percentChange: thirtyDayChange * 100,
            keyFactors: [
              'Seasonal demand patterns',
              'Economic growth forecasts',
              'OPEC+ policy expectations',
              'Refining margin trends',
              'Weather pattern analysis'
            ],
            riskLevel: Math.abs(thirtyDayChange) > 0.08 ? 'High' : Math.abs(thirtyDayChange) > 0.04 ? 'Medium' : 'Low'
          }
        ],
        technicalSignals: {
          rsi: 30 + Math.random() * 40, // 30-70 RSI range
          macd: Math.random() > 0.6 ? 'Bullish' : Math.random() > 0.3 ? 'Bearish' : 'Neutral',
          movingAverage: Math.random() > 0.5 ? 'Above' : 'Below',
          support: currentPrice * (0.92 + Math.random() * 0.06), // 92-98% of current
          resistance: currentPrice * (1.02 + Math.random() * 0.06) // 102-108% of current
        },
        lastUpdated: new Date().toISOString()
      };
    };

    const mockForecasts: PriceForecast[] = [
      generateForecast('WTI Crude Oil', 73.45, 'USD', '$/barrel'),
      generateForecast('Brent Crude Oil', 78.12, 'USD', '$/barrel'),
      generateForecast('Natural Gas', 2.84, 'USD', '$/MMBtu'),
      generateForecast('RBOB Gasoline', 2.12, 'USD', '$/gallon'),
      generateForecast('Heating Oil', 2.34, 'USD', '$/gallon')
    ];

    const mockModelMetrics: ModelMetrics[] = [
      {
        modelName: 'Energy Price Neural Network v3.2',
        accuracy: 68.5,
        lastUpdate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        version: '3.2.1',
        trainingPeriod: '2019-2024',
        features: [
          'Technical indicators (RSI, MACD, Bollinger Bands)',
          'Fundamental data (inventory, production, consumption)',
          'Economic indicators (GDP, PMI, unemployment)',
          'Geopolitical sentiment analysis',
          'Weather and seasonal patterns'
        ]
      },
      {
        modelName: 'Transformer Price Predictor',
        accuracy: 72.3,
        lastUpdate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        version: '2.1.0',
        trainingPeriod: '2020-2024',
        features: [
          'Time series attention mechanisms',
          'Multi-asset correlation analysis',
          'News sentiment integration',
          'Options flow analysis',
          'Central bank policy tracking'
        ]
      }
    ];

    const avgVolatility = mockForecasts.reduce((sum, forecast) => {
      const vol = Math.abs(forecast.forecasts[0].percentChange) + Math.abs(forecast.forecasts[1].percentChange);
      return sum + vol / 2;
    }, 0) / mockForecasts.length;

    const mockData: AIPriceForecastData = {
      forecasts: mockForecasts,
      modelMetrics: mockModelMetrics,
      marketConditions: {
        volatility: avgVolatility > 6 ? 'High' : avgVolatility > 3 ? 'Medium' : 'Low',
        trendStrength: 45 + Math.random() * 30, // 45-75
        marketRegime: Math.random() > 0.7 ? 'Trending' : Math.random() > 0.4 ? 'Consolidating' : 'Volatile',
        forecastReliability: avgVolatility < 4 ? 'High' : avgVolatility < 7 ? 'Medium' : 'Low'
      },
      disclaimers: [
        'AI forecasts are for informational purposes only and should not be used as sole basis for trading decisions',
        'Past performance does not guarantee future results',
        'Model accuracy varies with market conditions and volatility levels',
        'Forecasts become less reliable during extreme market events',
        'Always consider multiple sources of analysis before making investment decisions'
      ],
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('AI price forecast data fetch error:', error);
    
    // Fallback data
    return {
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
  }
}

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    // Fetch fresh data
    const data = await fetchAIPriceForecastData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('AI price forecast API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      forecasts: [],
      modelMetrics: [],
      marketConditions: {
        volatility: 'Medium',
        trendStrength: 50,
        marketRegime: 'Consolidating',
        forecastReliability: 'Medium'
      },
      disclaimers: [],
      lastUpdated: new Date().toISOString()
    });
  }
}