import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/upload/sound — upload a sound file + create/update GameSound record
// FormData fields: file, id, name, category, associatedId, volume, loopable
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const id = formData.get('id') as string; // unique ID for the sound
    const name = (formData.get('name') as string) || id;
    const category = (formData.get('category') as string) || 'ui';
    const associatedId = formData.get('associatedId') as string | null;
    const volume = formData.get('volume') ? parseFloat(formData.get('volume') as string) : 1.0;
    const loopable = formData.get('loopable') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'audio/wav';

    // Upsert: create or update by id
    const sound = await db.gameSound.upsert({
      where: { id },
      update: {
        name,
        category,
        associatedId,
        volume,
        loopable,
        data: bytes,
        mimeType,
        filePath: '',
      },
      create: {
        id,
        name,
        refKey: id,
        category,
        associatedId,
        volume,
        loopable,
        data: bytes,
        mimeType,
        filePath: '',
      },
    });

    return NextResponse.json({
      success: true,
      id: sound.id,
      name: sound.name,
      size: bytes.length,
      mimeType,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/admin/upload/sound?id=xxx — remove BLOB data from a sound (keep metadata)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.gameSound.update({
      where: { id },
      data: { data: null, mimeType: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
