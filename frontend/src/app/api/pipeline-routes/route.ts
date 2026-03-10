import { NextResponse } from 'next/server';

interface PipelineRoute {
  id: string;
  name: string;
  operator: string;
  type: 'crude_oil' | 'natural_gas' | 'refined_products' | 'lng' | 'co2';
  status: 'operational' | 'under_construction' | 'planned' | 'decommissioned';
  capacity: string;
  length: string;
  coordinates: [number, number][]; // Array of [lng, lat] points for the route
  startLocation: string;
  endLocation: string;
  commissioning: string;
  countries: string[];
  description: string;
  source: string;
  lastUpdate: string;
}

// Static pipeline data - major global energy pipelines
function getMajorPipelineRoutes(): PipelineRoute[] {
  return [
    // MAJOR CRUDE OIL PIPELINES
    {
      id: 'keystone_xl',
      name: 'Keystone Pipeline System',
      operator: 'TC Energy',
      type: 'crude_oil',
      status: 'operational',
      capacity: '830,000 bpd',
      length: '4,324 km',
      coordinates: [
        [-110.15, 57.10], // Hardisty, AB
        [-105.50, 52.50], // Saskatchewan
        [-104.00, 50.00], // North Dakota
        [-97.50, 47.50],  // Minnesota
        [-95.00, 41.50],  // Nebraska  
        [-95.50, 39.00],  // Kansas
        [-94.50, 37.00],  // Missouri
        [-90.00, 35.00],  // Illinois
        [-87.50, 41.50],  // Chicago area
        [-84.50, 41.50],  // Toledo, OH
        [-82.50, 41.00]   // Patoka, IL
      ],
      startLocation: 'Hardisty, Alberta',
      endLocation: 'Patoka, Illinois / Cushing, Oklahoma',
      commissioning: '2010',
      countries: ['Canada', 'United States'],
      description: 'Major crude oil pipeline system from Canadian oil sands to US refineries',
      source: 'TC Energy / Public filings',
      lastUpdate: new Date().toISOString()
    },
    
    {
      id: 'colonial_pipeline',
      name: 'Colonial Pipeline',
      operator: 'Colonial Pipeline Company',
      type: 'refined_products',
      status: 'operational',
      capacity: '2.5 million bpd',
      length: '8,850 km',
      coordinates: [
        [-95.37, 29.76], // Houston, TX
        [-94.00, 30.00], // Louisiana
        [-91.50, 32.50], // Mississippi  
        [-87.50, 33.50], // Alabama
        [-85.00, 33.50], // Georgia
        [-82.50, 34.00], // South Carolina
        [-79.50, 35.50], // North Carolina
        [-78.50, 37.50], // Virginia
        [-77.00, 38.90], // Washington DC area
        [-76.50, 39.30], // Maryland
        [-75.50, 40.00], // Pennsylvania
        [-74.00, 40.70]  // New York/New Jersey
      ],
      startLocation: 'Houston, Texas',
      endLocation: 'New York Harbor',
      commissioning: '1962',
      countries: ['United States'],
      description: 'Largest refined products pipeline system in the United States',
      source: 'Colonial Pipeline Company',
      lastUpdate: new Date().toISOString()
    },

    // MAJOR NATURAL GAS PIPELINES
    {
      id: 'nord_stream_1',
      name: 'Nord Stream 1',
      operator: 'Nord Stream AG',
      type: 'natural_gas',
      status: 'decommissioned',
      capacity: '55 bcm/year',
      length: '1,224 km',
      coordinates: [
        [82.90, 66.60],  // Yuzhno-Russkoye field
        [49.50, 58.50],  // Compressor Station Portovaya
        [27.50, 59.50],  // Baltic Sea route
        [20.00, 59.00],  // Baltic Sea
        [15.00, 57.00],  // Baltic Sea
        [12.00, 55.50],  // Baltic Sea  
        [10.50, 54.00],  // Near German coast
        [8.60, 53.90]    // Lubmin, Germany
      ],
      startLocation: 'Vyborg, Russia',
      endLocation: 'Lubmin, Germany',
      commissioning: '2011',
      countries: ['Russia', 'Germany'],
      description: 'Offshore natural gas pipeline through the Baltic Sea (currently non-operational)',
      source: 'Nord Stream AG / Public records',
      lastUpdate: new Date().toISOString()
    },
    
    {
      id: 'trans_alaska_pipeline',
      name: 'Trans-Alaska Pipeline System (TAPS)',
      operator: 'Alyeska Pipeline Service Company',
      type: 'crude_oil',
      status: 'operational',
      capacity: '2.1 million bpd',
      length: '1,287 km',
      coordinates: [
        [-149.50, 70.25], // Prudhoe Bay
        [-149.00, 69.50], // Pump Station 1
        [-148.50, 68.50], // Pump Station 2
        [-147.50, 67.50], // Pump Station 3
        [-146.00, 66.00], // Fairbanks area
        [-145.50, 65.00], // Pump Station 6
        [-145.00, 64.00], // Pump Station 7
        [-146.50, 63.00], // Pump Station 8
        [-148.00, 62.00], // Pump Station 9
        [-149.50, 61.20]  // Valdez Marine Terminal
      ],
      startLocation: 'Prudhoe Bay, Alaska',
      endLocation: 'Valdez, Alaska',
      commissioning: '1977',
      countries: ['United States'],
      description: 'Major crude oil pipeline from North Slope to southern Alaska',
      source: 'Alyeska Pipeline Service Company',
      lastUpdate: new Date().toISOString()
    },

    {
      id: 'turkstream',
      name: 'TurkStream',
      operator: 'Gazprom',
      type: 'natural_gas',
      status: 'operational',
      capacity: '31.5 bcm/year',
      length: '930 km',
      coordinates: [
        [39.70, 45.00],  // Anapa, Russia
        [32.00, 43.00],  // Black Sea route
        [29.00, 42.00],  // Black Sea
        [28.50, 41.50],  // Kırklareli, Turkey
        [28.00, 41.00],  // Thrace region
        [27.00, 40.50],  // Bulgaria connection
        [25.50, 43.50],  // Bulgaria
        [23.00, 44.50]   // Serbia connection
      ],
      startLocation: 'Anapa, Russia',
      endLocation: 'Kırklareli, Turkey / Bulgaria',
      commissioning: '2020',
      countries: ['Russia', 'Turkey', 'Bulgaria', 'Serbia'],
      description: 'Natural gas pipeline through the Black Sea to Turkey and Southeast Europe',
      source: 'Gazprom / Public filings',
      lastUpdate: new Date().toISOString()
    },

    {
      id: 'druzhba_pipeline',
      name: 'Druzhba Pipeline',
      operator: 'Transneft',
      type: 'crude_oil',
      status: 'operational',  
      capacity: '1.4 million bpd',
      length: '4,000 km',
      coordinates: [
        [73.50, 61.00], // West Siberian fields
        [58.50, 56.50], // Almetyevsk
        [49.50, 55.50], // Samara
        [44.50, 51.50], // Volgograd region
        [39.00, 50.50], // Bryansk, Russia
        [32.00, 51.50], // Mozyr, Belarus
        [24.00, 52.50], // Poland branch
        [21.00, 52.00], // Warsaw area
        [14.50, 52.50], // Germany branch
        [28.50, 50.50], // Ukraine branch
        [24.00, 49.00], // Slovakia
        [19.00, 47.50], // Hungary
        [16.50, 47.50]  // Austria
      ],
      startLocation: 'Samara, Russia',
      endLocation: 'Germany / Poland / Slovakia / Hungary',
      commissioning: '1964',
      countries: ['Russia', 'Belarus', 'Poland', 'Germany', 'Ukraine', 'Slovakia', 'Hungary', 'Czech Republic'],
      description: 'Major crude oil pipeline system from Russia to Central and Eastern Europe',
      source: 'Transneft / Public records',
      lastUpdate: new Date().toISOString()
    },

    // MIDDLE EAST PIPELINES
    {
      id: 'baku_tbilisi_ceyhan',
      name: 'Baku-Tbilisi-Ceyhan Pipeline',
      operator: 'BTC Co.',
      type: 'crude_oil',
      status: 'operational',
      capacity: '1.2 million bpd',
      length: '1,768 km',
      coordinates: [
        [49.87, 40.38], // Baku, Azerbaijan
        [48.50, 40.50], // Azerbaijan
        [46.50, 41.00], // Georgia border
        [44.83, 41.69], // Tbilisi, Georgia
        [42.50, 41.50], // Georgia
        [40.00, 41.00], // Turkey border
        [38.50, 40.50], // Eastern Turkey
        [36.50, 39.50], // Central Turkey
        [35.00, 37.00], // Southern Turkey
        [35.89, 36.95]  // Ceyhan, Turkey
      ],
      startLocation: 'Baku, Azerbaijan',
      endLocation: 'Ceyhan, Turkey',
      commissioning: '2006',
      countries: ['Azerbaijan', 'Georgia', 'Turkey'],
      description: 'Major crude oil export pipeline from Caspian Sea to Mediterranean',
      source: 'BTC Company / Public filings',
      lastUpdate: new Date().toISOString()
    },

    {
      id: 'east_west_pipeline_china',
      name: 'West-East Gas Pipeline (China)',
      operator: 'PetroChina',
      type: 'natural_gas',
      status: 'operational',
      capacity: '17 bcm/year',
      length: '4,000 km',
      coordinates: [
        [84.00, 41.00], // Lunnan, Xinjiang
        [87.60, 43.80], // Urumqi
        [106.50, 38.50], // Yinchuan
        [109.50, 35.50], // Yan'an
        [112.50, 34.50], // Zhengzhou
        [117.00, 32.00], // Nanjing
        [121.50, 31.50]  // Shanghai
      ],
      startLocation: 'Tarim Basin, Xinjiang',
      endLocation: 'Shanghai',
      commissioning: '2004',
      countries: ['China'],
      description: 'Major natural gas pipeline from western China gas fields to eastern cities',
      source: 'PetroChina / Public records',
      lastUpdate: new Date().toISOString()
    }
  ];
}

export async function GET() {
  try {
    const pipelines = getMajorPipelineRoutes();
    
    return NextResponse.json({
      pipelines,
      lastUpdate: new Date().toISOString(),
      totalRoutes: pipelines.length,
      dataSource: 'static',
      coverage: 'Global major pipeline routes',
      note: 'Static data of major oil and gas pipeline infrastructure worldwide'
    });
    
  } catch (error) {
    console.error('Pipeline routes API error:', error);
    
    return NextResponse.json({
      pipelines: [],
      lastUpdate: new Date().toISOString(),
      totalRoutes: 0,
      dataSource: 'error',
      error: 'Failed to load pipeline route data'
    });
  }
}