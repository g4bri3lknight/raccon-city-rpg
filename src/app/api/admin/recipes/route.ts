import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';

/** Serialize a value to JSON string — skip if already a string */
function jsonStr(val: unknown, fallback: string): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return fallback; }
}
// GET /api/admin/recipes — list all
export async function GET() {
  try {
    const recipes = await db.gameRecipe.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return NextResponse.json(recipes);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Recipes]');
  }
}

// POST /api/admin/recipes — create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const recipe = await db.gameRecipe.create({
      data: {
        ...body,
        ingredients: jsonStr(body.ingredients, '[]'),
        resultQty: body.resultQty != null ? Number(body.resultQty) : 1,
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
        pointCost: body.pointCost != null ? Number(body.pointCost) : null,
        priority: body.priority != null ? Number(body.priority) : 0,
      },
    });
    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Recipes]');
  }
}

// PUT /api/admin/recipes — update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    if (data.ingredients !== undefined) data.ingredients = jsonStr(data.ingredients, '[]');
    if (data.resultQty !== undefined) data.resultQty = Number(data.resultQty);
    if (data.sortOrder !== undefined) data.sortOrder = Number(data.sortOrder);
    if (data.pointCost !== undefined) data.pointCost = data.pointCost != null ? Number(data.pointCost) : null;
    if (data.priority !== undefined) data.priority = Number(data.priority);
    const recipe = await db.gameRecipe.update({ where: { id }, data });
    return NextResponse.json(recipe);
  } catch (error) {
    return safeErrorResponse(error, '[Admin Recipes]');
  }
}

// DELETE /api/admin/recipes — delete
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await db.gameRecipe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeErrorResponse(error, '[Admin Recipes]');
  }
}
