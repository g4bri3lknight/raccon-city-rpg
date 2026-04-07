import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Serve an image BLOB from the database
// GET /api/media/image?ref=img_city_bg
// GET /api/media/image?id=img_city_bg
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref');
  const id = searchParams.get('id');

  try {
    let image = null;
    if (ref) {
      image = await db.gameImage.findUnique({ where: { refKey: ref } });
    } else if (id) {
      image = await db.gameImage.findUnique({ where: { id } });
    }

    if (!image || !image.data) {
      return NextResponse.json({ error: 'Image not found in DB' }, { status: 404 });
    }

    const mimeType = image.mimeType || 'image/png';
    return new NextResponse(image.data, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(image.data.length),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
