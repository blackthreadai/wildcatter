import { NextResponse } from 'next/server';

// Cache for 4 hours (COT data updates weekly on Fridays)
let cache: { data: any; ts: number } | null = null;
const CACHE_MS = 4 * 60 * 60 * 1000;

// CFTC contract market codes for key energy commodities
const ENERGY_CONTRACTS = [
  { code: '067651', name: 'WTI Crude Oil', category: 'Crude Oil' },
  { code: '023651', name: 'Natural Gas (Henry Hub)', category: 'Natural Gas' },
  { code: '111659', name: 'RBOB Gasoline', category: 'Refined Products' },
  { code: '022651', name: 'Heating Oil', category: 'Refined Products' },
];

interface COTRecord {
  commodity_name: string;
  market_and_exchange_names: string;
  cftc_contract_market_code: string;
  report_date_as_yyyy_mm_dd: string;
  open_interest_all: string;
  noncomm_positions_long_all: string;
  noncomm_positions_short_all: string;
  comm_positions_long_all: string;
  comm_positions_short_all: string;
  nonrept_positions_long_all: string;
  nonrept_positions_short_all: string;
  change_in_open_interest_all: string;
  change_in_noncomm_long_all: string;
  change_in_noncomm_short_all: string;
  change_in_comm_long_all: string;
  change_in_comm_short_all: string;
}

async function fetchCOTData() {
  const codes = ENERGY_CONTRACTS.map(c => `'${c.code}'`).join(',');
  
  // Fetch latest 2 reports for each contract to calculate weekly changes
  const url = `https://publicreporting.cftc.gov/resource/6dca-aqww.json?$where=cftc_contract_market_code in(${codes})&$order=report_date_as_yyyy_mm_dd DESC&$limit=10&$select=commodity_name,market_and_exchange_names,cftc_contract_market_code,report_date_as_yyyy_mm_dd,open_interest_all,noncomm_positions_long_all,noncomm_positions_short_all,comm_positions_long_all,comm_positions_short_all,nonrept_positions_long_all,nonrept_positions_short_all,change_in_open_interest_all,change_in_noncomm_long_all,change_in_noncomm_short_all,change_in_comm_long_all,change_in_comm_short_all`;

  console.log('📊 POSITION MONITOR: Fetching real CFTC COT data...');

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Wildcatter-Terminal/1.0' },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) throw new Error(`CFTC API error: ${resp.status}`);
  
  const records: COTRecord[] = await resp.json();
  console.log(`✅ Received ${records.length} COT records from CFTC`);
  return records;
}

function buildPositionData(records: COTRecord[]) {
  const positions: any[] = [];
  const traderClasses: any[] = [];

  for (const contract of ENERGY_CONTRACTS) {
    // Get latest report for this contract
    const latest = records.find(r => r.cftc_contract_market_code === contract.code);
    if (!latest) continue;

    const noncommLong = parseInt(latest.noncomm_positions_long_all) || 0;
    const noncommShort = parseInt(latest.noncomm_positions_short_all) || 0;
    const commLong = parseInt(latest.comm_positions_long_all) || 0;
    const commShort = parseInt(latest.comm_positions_short_all) || 0;
    const nonreptLong = parseInt(latest.nonrept_positions_long_all) || 0;
    const nonreptShort = parseInt(latest.nonrept_positions_short_all) || 0;
    const oi = parseInt(latest.open_interest_all) || 1;
    const netNoncomm = noncommLong - noncommShort;
    const changeInNet = (parseInt(latest.change_in_noncomm_long_all) || 0) - (parseInt(latest.change_in_noncomm_short_all) || 0);

    // Determine sentiment from speculator positioning
    const specRatio = noncommLong / (noncommLong + noncommShort || 1);
    let sentiment: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    if (specRatio > 0.55) sentiment = 'Bullish';
    else if (specRatio < 0.45) sentiment = 'Bearish';

    positions.push({
      instrument: contract.name,
      category: contract.category,
      longPositions: noncommLong,
      shortPositions: noncommShort,
      netPositions: netNoncomm,
      openInterest: oi,
      positionChange: changeInNet,
      sentiment,
      unit: 'contracts',
      lastUpdated: latest.report_date_as_yyyy_mm_dd,
    });

    // Trader class breakdown
    const totalPositions = noncommLong + noncommShort + commLong + commShort + nonreptLong + nonreptShort;
    traderClasses.push({
      instrument: contract.name,
      classes: [
        {
          name: 'Non-Commercial (Speculators)',
          description: 'Hedge funds, managed money, and other large speculators',
          longPositions: noncommLong,
          shortPositions: noncommShort,
          netPositions: netNoncomm,
          weeklyChange: changeInNet,
          marketShare: totalPositions > 0 ? ((noncommLong + noncommShort) / totalPositions * 100) : 0,
        },
        {
          name: 'Commercial (Hedgers)',
          description: 'Producers, refiners, merchants, and other commercial hedgers',
          longPositions: commLong,
          shortPositions: commShort,
          netPositions: commLong - commShort,
          weeklyChange: (parseInt(latest.change_in_comm_long_all) || 0) - (parseInt(latest.change_in_comm_short_all) || 0),
          marketShare: totalPositions > 0 ? ((commLong + commShort) / totalPositions * 100) : 0,
        },
        {
          name: 'Non-Reportable (Small Traders)',
          description: 'Small traders below CFTC reporting thresholds',
          longPositions: nonreptLong,
          shortPositions: nonreptShort,
          netPositions: nonreptLong - nonreptShort,
          weeklyChange: 0,
          marketShare: totalPositions > 0 ? ((nonreptLong + nonreptShort) / totalPositions * 100) : 0,
        },
      ],
    });

    console.log(`✅ ${contract.name}: Spec Net ${netNoncomm >= 0 ? '+' : ''}${netNoncomm} | OI: ${oi} | ${sentiment}`);
  }

  // Calculate aggregate metrics
  const oilPositions = positions.filter(p => p.category === 'Crude Oil');
  const totalSpecNet = positions.reduce((sum, p) => sum + p.netPositions, 0);
  const totalOI = positions.reduce((sum, p) => sum + p.openInterest, 0);
  const specNetPct = totalOI > 0 ? Math.abs((totalSpecNet / totalOI) * 100) : 0;

  // Commercial net short as percentage
  const totalCommNet = traderClasses.reduce((sum, tc) => {
    const comm = tc.classes.find((c: any) => c.name.includes('Commercial'));
    return sum + (comm ? comm.netPositions : 0);
  }, 0);
  const commNetShortPct = totalOI > 0 ? Math.abs((totalCommNet / totalOI) * 100) : 0;

  // Extreme positions (net > 15% of OI)
  const extremePositions = positions
    .filter(p => Math.abs(p.netPositions / p.openInterest) > 0.10)
    .map(p => p.instrument);

  // Overall sentiment
  const bullishCount = positions.filter(p => p.sentiment === 'Bullish').length;
  const bearishCount = positions.filter(p => p.sentiment === 'Bearish').length;
  let overallSentiment: 'Risk On' | 'Risk Off' | 'Mixed' = 'Mixed';
  if (bullishCount > bearishCount + 1) overallSentiment = 'Risk On';
  else if (bearishCount > bullishCount + 1) overallSentiment = 'Risk Off';

  // Sentiment indicators derived from real COT data
  const sentimentIndicators = [];

  // Spec ratio for oil
  if (oilPositions.length > 0) {
    const oilSpecLong = oilPositions.reduce((s, p) => s + p.longPositions, 0);
    const oilSpecShort = oilPositions.reduce((s, p) => s + p.shortPositions, 0);
    const oilSpecRatio = Math.round((oilSpecLong / (oilSpecLong + oilSpecShort || 1)) * 100);
    sentimentIndicators.push({
      name: 'Oil Speculator Long Ratio',
      value: oilSpecRatio,
      interpretation: oilSpecRatio > 65 ? 'Heavy long positioning - crowded trade risk' :
                      oilSpecRatio > 55 ? 'Moderate bullish positioning' :
                      oilSpecRatio > 45 ? 'Balanced positioning' :
                      'Net short - bearish positioning',
      trend: positions[0]?.positionChange > 0 ? 'Rising' as const : positions[0]?.positionChange < 0 ? 'Falling' as const : 'Stable' as const,
      lastUpdated: positions[0]?.lastUpdated || new Date().toISOString(),
    });
  }

  // Gas spec ratio
  const gasPos = positions.find(p => p.instrument.includes('Natural Gas'));
  if (gasPos) {
    const gasSpecRatio = Math.round((gasPos.longPositions / (gasPos.longPositions + gasPos.shortPositions || 1)) * 100);
    sentimentIndicators.push({
      name: 'Gas Speculator Long Ratio',
      value: gasSpecRatio,
      interpretation: gasSpecRatio > 55 ? 'Speculators net long gas' :
                      gasSpecRatio > 45 ? 'Balanced gas positioning' :
                      'Heavy short positioning in gas',
      trend: gasPos.positionChange > 0 ? 'Rising' as const : gasPos.positionChange < 0 ? 'Falling' as const : 'Stable' as const,
      lastUpdated: gasPos.lastUpdated,
    });
  }

  // Commercial hedging pressure
  sentimentIndicators.push({
    name: 'Commercial Hedging Pressure',
    value: Math.min(100, Math.round(commNetShortPct * 2)),
    interpretation: commNetShortPct > 40 ? 'Heavy commercial hedging - producers locking in prices' :
                    commNetShortPct > 25 ? 'Moderate hedging activity' :
                    'Light hedging - producers not rushing to sell forward',
    trend: 'Stable' as const,
    lastUpdated: positions[0]?.lastUpdated || new Date().toISOString(),
  });

  return {
    positions,
    traderClasses,
    sentimentIndicators,
    marketSummary: {
      overallSentiment,
      specNetLong: specNetPct,
      commercialNetShort: commNetShortPct,
      extremePositions,
    },
    lastUpdated: positions[0]?.lastUpdated || new Date().toISOString(),
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    const records = await fetchCOTData();
    
    if (!records || records.length === 0) {
      console.log('❌ No COT data returned from CFTC');
      return NextResponse.json({
        positions: [], traderClasses: [], sentimentIndicators: [],
        marketSummary: { overallSentiment: 'Mixed', specNetLong: 0, commercialNetShort: 0, extremePositions: [] },
        lastUpdated: new Date().toISOString(),
      });
    }

    const data = buildPositionData(records);
    cache = { data, ts: Date.now() };
    
    console.log(`✅ Position Monitor: ${data.positions.length} instruments from real CFTC COT data`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Position monitor API error:', error);
    return NextResponse.json({
      positions: [], traderClasses: [], sentimentIndicators: [],
      marketSummary: { overallSentiment: 'Mixed', specNetLong: 0, commercialNetShort: 0, extremePositions: [] },
      lastUpdated: new Date().toISOString(),
    });
  }
}
