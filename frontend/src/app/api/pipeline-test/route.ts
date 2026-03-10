import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    test: 'Pipeline API is working',
    timestamp: new Date().toISOString()
  });
}