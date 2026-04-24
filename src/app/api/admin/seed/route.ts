import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { safeErrorResponse } from '@/lib/api-utils';

export async function POST() {
  try {
    // Delete all pre-seeded sound records (no synthesized/placeholder sounds)
    const deleted = await db.gameSound.deleteMany();
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Seed]');
  }
}
