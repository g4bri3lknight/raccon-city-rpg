import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api-utils';

// GET /api/admin/quest-chains/[id] — get a single quest chain with steps and final reward
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chain = await db.questChain.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { stepIndex: 'asc' } },
        finalReward: true,
      },
    });
    if (!chain) {
      return NextResponse.json({ error: 'Quest chain not found' }, { status: 404 });
    }
    return NextResponse.json(chain);
  } catch (error) {
    return safeErrorResponse(error, '[Quest Chains GET by ID]');
  }
}
