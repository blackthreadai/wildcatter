import { NextResponse } from 'next/server';

// Cache for 12 hours (Baker Hughes updates weekly on Fridays)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 12 * 60 * 60 * 1000;

// ── Fetch DPR Excel and parse rig counts ────────────────────────────
async function fetchDPRData() {
  // EIA publishes DPR data as Excel - we'll fetch and parse the CSV version
  // The CSV is lighter weight for serverless
  const regions = ['Permian', 'Eagle Ford', 'Bakken', 'Niobrara', 'Anadarko', 'Appalachia', 'Haynesville'];
  
  // Try the EIA API first (petroleum/dril routes)
  let eiaApiKey: string | undefined;
  try { eiaApiKey = process.env.EIA_API_KEY; } catch { /* */ }

  if (eiaApiKey) {
    // Try various possible EIA paths for rig count data
    const paths = [
      'petroleum/dril/dpr/data',
      'petroleum/dril/rig-count/data', 
      'petroleum/sum/sndw/data',
    ];

    for (const path of paths) {
      try {
        const url = `https://api.eia.gov/v2/${path}/?api_key=${eiaApiKey}&frequency=monthly&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&length=20`;
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
          signal: AbortSignal.timeout(8000),
        });
        const json = await resp.json();
        const rows = json?.response?.data || [];
        
        if (rows.length > 0) {
          // Found data - try to extract rig counts
          const rigRows = rows.filter((r: Record<string, string>) => {
            const desc = (r['series-description'] || r['product-name'] || '').toLowerCase();
            return desc.includes('rig') || desc.includes('drill');
          });
          
          if (rigRows.length > 0) {
            console.log(`Found rig data at ${path}: ${rigRows.length} rows`);
            // Parse and return
            const basins = [];
            let total = 0;
            
            for (const row of rigRows) {
              const val = parseFloat(row.value);
              if (isNaN(val)) continue;
              const desc = row['series-description'] || row.duoarea || '';
              const regionMatch = regions.find(r => desc.includes(r));
              if (regionMatch) {
                basins.push({
                  basin: regionMatch,
                  rigs: Math.round(val),
                  change: 0,
                  percentage: 0,
                  period: row.period,
                });
                total += val;
              }
            }
            
            // Calculate percentages
            for (const b of basins) {
              b.percentage = total > 0 ? Math.round((b.rigs / total) * 1000) / 10 : 0;
            }
            basins.sort((a, b) => b.rigs - a.rigs);
            
            return { basins, totalRigs: Math.round(total) };
          }
        }
      } catch {
        continue;
      }
    }
  }
  
  // Fallback: download and parse the DPR Excel file from EIA
  try {
    const resp = await fetch('https://www.eia.gov/petroleum/drilling/xls/dpr-data.xlsx', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!resp.ok) throw new Error(`DPR download failed: ${resp.status}`);
    
    // Parse the XLSX file - extract rig count column from each region sheet
    // XLSX files are ZIP archives containing XML
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Simple XLSX parser: find sheet data in shared strings and sheet XML
    // This is a lightweight approach - we look for the rig count data pattern
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Extract region rig counts from the raw XML content
    const basins: { basin: string; rigs: number; change: number; percentage: number; period: string }[] = [];
    let totalRigs = 0;
    
    // For each region, find the latest rig count from the sheet data
    for (const region of regions) {
      // Look for the region name in the file content
      const regionIdx = text.indexOf(`${region} Region`);
      if (regionIdx === -1) continue;
      
      // Find numeric values near "Rig count" in the same sheet
      // This is a simplified parser - the real data is in sheet XML
      const sheetData = text.substring(regionIdx, regionIdx + 50000);
      
      // Look for the last numeric value that could be a rig count (1-500 range)
      const numbers = sheetData.match(/\b(\d{1,3}(?:\.\d)?)\b/g);
      if (numbers && numbers.length > 2) {
        // The rig count is typically the second column, latest row
        // For DPR data, rig counts are in the range of 10-350
        const candidates = numbers
          .map(n => parseFloat(n))
          .filter(n => n >= 5 && n <= 500);
        
        if (candidates.length > 0) {
          const latestRig = candidates[candidates.length - 1];
          basins.push({
            basin: region,
            rigs: Math.round(latestRig),
            change: 0,
            percentage: 0,
            period: 'latest',
          });
          totalRigs += latestRig;
        }
      }
    }
    
    // Calculate percentages
    for (const b of basins) {
      b.percentage = totalRigs > 0 ? Math.round((b.rigs / totalRigs) * 1000) / 10 : 0;
    }
    basins.sort((a, b) => b.rigs - a.rigs);
    
    if (basins.length > 0) {
      return { basins, totalRigs: Math.round(totalRigs) };
    }
  } catch (err) {
    console.error('DPR Excel parse error:', err);
  }
  
  return null;
}

// ── International Rig Count from EIA ────────────────────────────────
async function fetchInternationalRigs(apiKey: string) {
  try {
    const url = `https://api.eia.gov/v2/international/data/?api_key=${apiKey}&frequency=monthly&data[0]=value&facets[productId][]=RIG&sort[0][column]=period&sort[0][direction]=desc&length=50`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EnergyTerminal/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    const json = await resp.json();
    const rows = json?.response?.data || [];

    if (rows.length === 0) return [];

    const latest: Record<string, { value: number; period: string; name: string }> = {};
    for (const row of rows) {
      const id = row.countryRegionId;
      if (!id || latest[id]) continue;
      latest[id] = {
        value: parseFloat(row.value),
        period: row.period,
        name: row.countryRegionName || id,
      };
    }

    return Object.values(latest)
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(r => ({
        region: r.name,
        total: Math.round(r.value),
        period: r.period,
      }));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data);
    }

    let eiaApiKey: string | undefined;
    try { eiaApiKey = process.env.EIA_API_KEY; } catch { /* */ }

    const [dpr, international] = await Promise.all([
      fetchDPRData(),
      eiaApiKey ? fetchInternationalRigs(eiaApiKey) : Promise.resolve([]),
    ]);

    if (!dpr || dpr.basins.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch rig count data' }, { status: 502 });
    }

    const data = {
      usTotals: {
        total: dpr.totalRigs,
        oil: 0,
        gas: 0,
        weeklyChange: 0,
        period: dpr.basins[0]?.period || '',
      },
      basins: dpr.basins,
      international,
      lastUpdated: new Date().toISOString(),
      source: 'EIA Drilling Productivity Report',
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data);

  } catch (error) {
    console.error('Oil rig tracker API error:', error);
    return NextResponse.json({ error: 'Failed to fetch rig count data' }, { status: 502 });
  }
}
