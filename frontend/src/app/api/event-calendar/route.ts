import { NextResponse } from 'next/server';

interface EnergyEvent {
  id: string;
  title: string;
  type: 'Economic Data' | 'OPEC Meeting' | 'Earnings' | 'Government Report' | 'Conference' | 'Central Bank' | 'Inventory Data';
  date: string; // ISO date string
  time: string; // HH:MM format
  timezone: string;
  importance: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  expectedImpact: 'Bullish' | 'Bearish' | 'Neutral' | 'Unknown';
  affectedMarkets: string[]; // e.g., ['WTI', 'Brent', 'Natural Gas']
  source: string;
  location?: string;
  previousValue?: string;
  forecastValue?: string;
  actualValue?: string;
  url?: string;
}

interface EventCalendarData {
  upcomingEvents: EnergyEvent[];
  todaysEvents: EnergyEvent[];
  thisWeekEvents: EnergyEvent[];
  criticalEvents: EnergyEvent[]; // Next 30 days critical events
  marketImpactSummary: {
    highImpactCount: number;
    nextCriticalEvent: EnergyEvent | null;
    weeklyOutlook: string;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
  };
  lastUpdated: string;
}

// Cache for 1 hour (event calendars don't change super frequently)
let cache: { data: EventCalendarData; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;

async function fetchEventCalendarData(): Promise<EventCalendarData> {
  try {
    // In production, this would fetch from economic calendar APIs, government schedules, etc.
    // For now, return realistic mock data based on typical energy market events
    
    const now = new Date();
    const generateEvents = (): EnergyEvent[] => {
      const events: EnergyEvent[] = [];
      
      // Generate events for next 14 days
      for (let i = 0; i < 14; i++) {
        const eventDate = new Date(now);
        eventDate.setDate(now.getDate() + i);
        
        // EIA Petroleum Status Report (weekly on Wednesdays)
        if (eventDate.getDay() === 3) { // Wednesday
          events.push({
            id: `eia-${eventDate.toISOString().split('T')[0]}`,
            title: 'EIA Petroleum Status Report',
            type: 'Government Report',
            date: eventDate.toISOString(),
            time: '10:30',
            timezone: 'EST',
            importance: 'High',
            description: 'Weekly U.S. petroleum inventory and production data including crude oil, gasoline, and distillate stocks',
            expectedImpact: 'Unknown',
            affectedMarkets: ['WTI', 'RBOB Gasoline', 'Heating Oil'],
            source: 'EIA',
            previousValue: 'Crude: -2.5M barrels',
            forecastValue: 'Crude: -1.2M barrels',
            url: 'https://www.eia.gov/petroleum/supply/weekly/'
          });
        }

        // Natural Gas Storage Report (weekly on Thursdays)
        if (eventDate.getDay() === 4) { // Thursday
          events.push({
            id: `natgas-${eventDate.toISOString().split('T')[0]}`,
            title: 'EIA Natural Gas Storage Report',
            type: 'Government Report',
            date: eventDate.toISOString(),
            time: '10:30',
            timezone: 'EST',
            importance: 'High',
            description: 'Weekly U.S. natural gas storage levels and injection/withdrawal data',
            expectedImpact: 'Unknown',
            affectedMarkets: ['Natural Gas'],
            source: 'EIA',
            previousValue: '+85 BCF',
            forecastValue: '+72 BCF'
          });
        }

        // Baker Hughes Rig Count (weekly on Fridays)
        if (eventDate.getDay() === 5) { // Friday
          events.push({
            id: `rigs-${eventDate.toISOString().split('T')[0]}`,
            title: 'Baker Hughes Rig Count',
            type: 'Government Report',
            date: eventDate.toISOString(),
            time: '13:00',
            timezone: 'EST',
            importance: 'Medium',
            description: 'Weekly count of active oil and gas drilling rigs in North America',
            expectedImpact: 'Neutral',
            affectedMarkets: ['WTI', 'Natural Gas'],
            source: 'Baker Hughes',
            previousValue: 'Oil: 485, Gas: 98'
          });
        }

        // Monthly events
        if (eventDate.getDate() === 12) {
          events.push({
            id: `opec-${eventDate.toISOString().split('T')[0]}`,
            title: 'OPEC+ Ministerial Meeting',
            type: 'OPEC Meeting',
            date: eventDate.toISOString(),
            time: '09:00',
            timezone: 'CET',
            importance: 'Critical',
            description: 'OPEC+ ministers meet to discuss production quotas and market strategy',
            expectedImpact: 'Unknown',
            affectedMarkets: ['WTI', 'Brent', 'All Oil Products'],
            source: 'OPEC',
            location: 'Vienna, Austria',
            url: 'https://www.opec.org/'
          });
        }

        // Fed meetings impact energy
        if (i === 7) {
          events.push({
            id: `fed-${eventDate.toISOString().split('T')[0]}`,
            title: 'Federal Reserve Interest Rate Decision',
            type: 'Central Bank',
            date: eventDate.toISOString(),
            time: '14:00',
            timezone: 'EST',
            importance: 'High',
            description: 'Federal Reserve announces interest rate decision and monetary policy statement',
            expectedImpact: 'Unknown',
            affectedMarkets: ['All Energy Markets'],
            source: 'Federal Reserve',
            location: 'Washington, D.C.',
            forecastValue: '5.25-5.50%'
          });
        }

        // Earnings for major energy companies
        if (i === 3 || i === 10) {
          const companies = ['ExxonMobil', 'Chevron', 'ConocoPhillips', 'Marathon Petroleum'];
          const company = companies[i % companies.length];
          events.push({
            id: `earnings-${company}-${eventDate.toISOString().split('T')[0]}`,
            title: `${company} Earnings`,
            type: 'Earnings',
            date: eventDate.toISOString(),
            time: '07:00',
            timezone: 'EST',
            importance: 'Medium',
            description: `${company} reports quarterly earnings and guidance`,
            expectedImpact: 'Neutral',
            affectedMarkets: ['Energy Stocks'],
            source: company,
            forecastValue: '$2.85 EPS'
          });
        }
      }

      return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    const allEvents = generateEvents();
    const today = now.toISOString().split('T')[0];
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    const todaysEvents = allEvents.filter(event => 
      event.date.split('T')[0] === today
    );

    const thisWeekEvents = allEvents.filter(event => 
      new Date(event.date) <= nextWeek
    );

    const criticalEvents = allEvents.filter(event => 
      event.importance === 'Critical' || event.importance === 'High'
    );

    const highImpactCount = criticalEvents.length;
    const nextCriticalEvent = criticalEvents.length > 0 ? criticalEvents[0] : null;

    // Assess weekly risk level
    const criticalThisWeek = thisWeekEvents.filter(e => e.importance === 'Critical').length;
    const highThisWeek = thisWeekEvents.filter(e => e.importance === 'High').length;
    
    let riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme' = 'Low';
    if (criticalThisWeek >= 2) riskLevel = 'Extreme';
    else if (criticalThisWeek >= 1 || highThisWeek >= 3) riskLevel = 'High';
    else if (highThisWeek >= 2) riskLevel = 'Medium';

    const weeklyOutlook = criticalThisWeek > 0 
      ? `High volatility expected due to ${criticalThisWeek} critical event${criticalThisWeek > 1 ? 's' : ''}`
      : highThisWeek > 0 
      ? `Moderate market-moving events this week`
      : `Relatively quiet week for energy markets`;

    const mockData: EventCalendarData = {
      upcomingEvents: allEvents,
      todaysEvents,
      thisWeekEvents,
      criticalEvents,
      marketImpactSummary: {
        highImpactCount,
        nextCriticalEvent,
        weeklyOutlook,
        riskLevel
      },
      lastUpdated: new Date().toISOString()
    };

    return mockData;
    
  } catch (error) {
    console.error('Event calendar data fetch error:', error);
    
    // Fallback data
    const fallbackEvent: EnergyEvent = {
      id: 'eia-fallback',
      title: 'EIA Petroleum Status Report',
      type: 'Government Report',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      time: '10:30',
      timezone: 'EST',
      importance: 'High',
      description: 'Weekly U.S. petroleum inventory data',
      expectedImpact: 'Unknown',
      affectedMarkets: ['WTI', 'RBOB Gasoline'],
      source: 'EIA'
    };

    return {
      upcomingEvents: [fallbackEvent],
      todaysEvents: [],
      thisWeekEvents: [fallbackEvent],
      criticalEvents: [fallbackEvent],
      marketImpactSummary: {
        highImpactCount: 1,
        nextCriticalEvent: fallbackEvent,
        weeklyOutlook: 'Moderate market-moving events expected',
        riskLevel: 'Medium'
      },
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
    const data = await fetchEventCalendarData();
    
    // Cache the results
    cache = { data, ts: Date.now() };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Event calendar API error:', error);
    
    // Ultimate fallback
    return NextResponse.json({
      upcomingEvents: [],
      todaysEvents: [],
      thisWeekEvents: [],
      criticalEvents: [],
      marketImpactSummary: {
        highImpactCount: 0,
        nextCriticalEvent: null,
        weeklyOutlook: 'No major events scheduled',
        riskLevel: 'Low'
      },
      lastUpdated: new Date().toISOString()
    });
  }
}