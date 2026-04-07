import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Upload an image file and store as BLOB in DB
// POST /api/admin/images/upload
// FormData fields: file (File), id (string), name (string), refKey (string), category (string), altText (string), associatedId (string), sortOrder (number)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const id = formData.get('id') as string || `img_${Date.now()}`;
    const name = formData.get('name') as string || file.name;
    const refKey = formData.get('refKey') as string || null;
    const category = formData.get('category') as string || 'ui';
    const altText = formData.get('altText') as string || '';
    const associatedId = formData.get('associatedId') as string || null;
    const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;
    const mimeType = file.type || 'image/png';

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upsert: create or update existing
    const existing = await db.gameImage.findUnique({ where: { id } });
    if (existing) {
      const updated = await db.gameImage.update({
        where: { id },
        data: {
          name,
          refKey: refKey || undefined,
          category,
          altText,
          associatedId,
          sortOrder,
          data: buffer,
          mimeType,
        },
      });
      return NextResponse.json(updated);
    } else {
      const created = await db.gameImage.create({
        data: {
          id,
          name,
          refKey: refKey || undefined,
          filePath: '',
          category,
          altText,
          associatedId,
          sortOrder,
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
