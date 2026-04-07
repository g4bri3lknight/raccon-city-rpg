import { NextResponse } from 'next/server';

/**
 * POST /api/admin/refresh
 * Tells the client to reload game data from DB.
 * (The client will call refreshGameData() which fetches from /api/game-data.)
 */
export async function POST() {
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ success: true });
}
