import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/game-settings — public endpoint, returns all settings as key-value map
export async function GET() {
  try {
    const rows = await db.gameSetting.findMany({ orderBy: { sortOrder: 'asc' } });
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    return NextResponse.json(map);
  } catch (error) {
    return NextResponse.json({}, { status: 200 }); // return empty, component uses defaults
  }
}
