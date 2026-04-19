import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

import { safeErrorResponse } from '@/lib/api-utils';
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
    const recipe = await db.gameRecipe.create({ data: body });
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
