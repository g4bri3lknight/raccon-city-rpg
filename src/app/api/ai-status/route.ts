import { NextResponse } from 'next/server';
import { getZaiClient } from '@/lib/ai';

export async function GET() {
  try {
    const zai = await getZaiClient();
    return NextResponse.json({ available: zai !== null });
  } catch {
    return NextResponse.json({ available: false });
  }
}
