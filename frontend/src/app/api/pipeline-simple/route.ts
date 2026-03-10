import { NextResponse } from 'next/server';

export async function GET() {
  const pipelines = [
    {
      id: 'test_pipeline',
      name: 'Test Pipeline',
      operator: 'Test Corp',
      type: 'crude_oil',
      status: 'operational',
      capacity: '100,000 bpd',
      length: '100 km',
      coordinates: [
        [-95.0, 29.0], // Houston
        [-94.0, 30.0]  // Louisiana
      ],
      startLocation: 'Houston, TX',
      endLocation: 'Louisiana',
      countries: ['United States'],
      description: 'Test pipeline for debugging'
    }
  ];
  
  return NextResponse.json({
    pipelines,
    totalRoutes: pipelines.length,
    dataSource: 'test'
  });
}