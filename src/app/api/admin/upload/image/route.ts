import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/upload/image — upload an image file + create/update GameImage record
// FormData fields: file, id, name, category, associatedId, altText, sortOrder
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const id = formData.get('id') as string; // unique ID for the image
    const name = (formData.get('name') as string) || id;
    const category = (formData.get('category') as string) || 'icon';
    const associatedId = formData.get('associatedId') as string | null;
    const altText = (formData.get('altText') as string) || '';
    const sortOrder = formData.get('sortOrder') ? parseInt(formData.get('sortOrder') as string, 10) : 0;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'image/png';

    // Upsert: create or update by id
    const image = await db.gameImage.upsert({
      where: { id },
      update: {
        name,
        category,
        associatedId,
        altText,
        sortOrder,
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
        altText,
        sortOrder,
        data: bytes,
        mimeType,
        filePath: '',
      },
    });

    return NextResponse.json({
      success: true,
      id: image.id,
      name: image.name,
      size: bytes.length,
      mimeType,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/admin/upload/image?id=xxx — remove BLOB data from an image (keep metadata)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.gameImage.update({
      where: { id },
      data: { data: null, mimeType: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
