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
const ENEMY_MUTABLE_FIELDS = [
  'name',
  'description',
  'maxHp',
  'atk',
  'def',
  'spd',
  'icon',
  'expReward',
  'isBoss',
  'abilities',
  'lootTable',
  'variantGroup',
  'sortOrder',
] as const;

// Fields only allowed during create
const ENEMY_CREATE_ONLY_FIELDS = ['id'] as const;

// JSON string fields that need serialization
const ENEMY_JSON_FIELDS = new Set(['abilities', 'lootTable']);

type EnemyBody = Record<string, unknown>;

function buildEnemyData(body: EnemyBody, isCreate: boolean) {
  const allowed = isCreate
    ? [...ENEMY_CREATE_ONLY_FIELDS, ...ENEMY_MUTABLE_FIELDS]
    : [...ENEMY_MUTABLE_FIELDS];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      const val = body[key];
      data[key] = ENEMY_JSON_FIELDS.has(key) ? jsonStr(val, '[]') : val;
    }
  }
  return data;
}

// GET /api/admin/enemies — list all
export async function GET() {
  try {
    const enemies = await db.gameEnemy.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(enemies);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Enemies]');
  }
}

// POST /api/admin/enemies — create
export async function POST(request: NextRequest) {
  try {
    const body: EnemyBody = await request.json();
    const data = buildEnemyData(body, true);
    const enemy = await db.gameEnemy.create({ data });
    return NextResponse.json(enemy, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Enemies]');
  }
}

// PUT /api/admin/enemies — update
export async function PUT(request: NextRequest) {
  try {
    const body: EnemyBody = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    const data = buildEnemyData(rest, false);
    const enemy = await db.gameEnemy.update({ where: { id: String(id) }, data });
    return NextResponse.json(enemy);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Enemies]');
  }
}

// DELETE /api/admin/enemies — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    // Cascade delete associated GameImage records
    await db.gameImage.deleteMany({ where: { associatedId: id } });
    await db.gameEnemy.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Enemies]');
  }
}
