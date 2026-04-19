import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
// --- Mass-assignment protection: explicit field mapping ---

function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    return fallback;
  }
}

// Fields allowed for both create and update
const ITEM_MUTABLE_FIELDS = [
  'name',
  'description',
  'type',
  'rarity',
  'icon',
  'usable',
  'equippable',
  'unico',
  'stackable',
  'maxStack',
  'weaponType',
  'ammoType',
  'modType',
  'effects',
  'sortOrder',
] as const;

// Fields only allowed during create
const ITEM_CREATE_ONLY_FIELDS = ['id'] as const;

// JSON string fields that need serialization
const ITEM_JSON_FIELDS = new Set(['effects']);

type ItemBody = Record<string, unknown>;

function buildItemData(body: ItemBody, isCreate: boolean) {
  const allowed = isCreate
    ? [...ITEM_CREATE_ONLY_FIELDS, ...ITEM_MUTABLE_FIELDS]
    : [...ITEM_MUTABLE_FIELDS];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      const val = body[key];
      data[key] = ITEM_JSON_FIELDS.has(key) ? jsonStr(val, '[]') : val;
    }
  }
  return data;
}

// GET /api/admin/items — list all (optional ?type= filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const items = await db.item.findMany({
      where: typeFilter ? { type: typeFilter } : undefined,
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Items]');
  }
}

// POST /api/admin/items — create
export async function POST(request: NextRequest) {
  try {
    const body: ItemBody = await request.json();
    const data = buildItemData(body, true);
    const item = await db.item.create({ data });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Items]');
  }
}

// PUT /api/admin/items — update
export async function PUT(request: NextRequest) {
  try {
    const body: ItemBody = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const data = buildItemData(rest, false);
    const item = await db.item.update({ where: { id: String(id) }, data });
    return NextResponse.json(item);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Items]');
  }
}

// DELETE /api/admin/items — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.item.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Items]');
  }
}
