import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';

/** Serialize a value to JSON string — skip if already a string */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}
// GET /api/admin/events — list all
export async function GET() {
  try {
    const events = await db.dynamicEvent.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(events);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Events]');
  }
}

// POST /api/admin/events — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = await db.dynamicEvent.create({
      data: {
        ...body,
        locationIds: jsonStr(body.locationIds, '[]'),
        choices: jsonStr(body.choices, '[]'),
        permanentMapEffect: jsonStr(body.permanentMapEffect, ''),
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Events]');
  }
}

// PUT /api/admin/events — update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    if (data.locationIds !== undefined) data.locationIds = jsonStr(data.locationIds, '[]');
    if (data.choices !== undefined) data.choices = jsonStr(data.choices, '[]');
    if (data.permanentMapEffect !== undefined) data.permanentMapEffect = jsonStr(data.permanentMapEffect, '');
    const event = await db.dynamicEvent.update({ where: { id }, data });
    return NextResponse.json(event);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Events]');
  }
}

// DELETE /api/admin/events — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.dynamicEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Events]');
  }
}
