import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      title: "TEST: This should work",
      url: "https://example.com",
      publishedAt: new Date().toISOString(),
      source: "Test Source"
    }
  ]);
}