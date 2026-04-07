import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Upload a sound file and store as BLOB in DB
// POST /api/admin/sounds/upload
// FormData fields: file (File), id (string), name (string), refKey (string), category (string), volume (number), loopable (boolean)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const id = formData.get('id') as string || `sound_${Date.now()}`;
    const name = formData.get('name') as string || file.name;
    const refKey = formData.get('refKey') as string || null;
    const category = formData.get('category') as string || 'ui';
    const volume = parseFloat(formData.get('volume') as string) || 1.0;
    const loopable = formData.get('loopable') === 'true';
    const mimeType = file.type || 'audio/wav';

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upsert: create or update existing
    const existing = await db.gameSound.findUnique({ where: { id } });
    if (existing) {
      const updated = await db.gameSound.update({
        where: { id },
        data: {
          name,
          refKey: refKey || undefined,
          category,
          volume,
          loopable,
          data: buffer,
          mimeType,
        },
      });
      return NextResponse.json(updated);
    } else {
      const created = await db.gameSound.create({
        data: {
          id,
          name,
          refKey: refKey || undefined,
          filePath: '',
          category,
          volume,
          loopable,
          data: buffer,
          mimeType,
        },
      });
      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
