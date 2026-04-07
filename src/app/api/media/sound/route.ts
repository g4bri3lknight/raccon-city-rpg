import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Serve a sound BLOB from the database
// GET /api/media/sound?ref=playAttack
// GET /api/media/sound?id=sfx_attack
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref');
  const id = searchParams.get('id');

  try {
    let sound = null;
    if (ref) {
      sound = await db.gameSound.findUnique({ where: { refKey: ref } });
    } else if (id) {
      sound = await db.gameSound.findUnique({ where: { id } });
    }

    if (!sound || !sound.data) {
      return NextResponse.json({ error: 'Sound not found in DB' }, { status: 404 });
    }

    const mimeType = sound.mimeType || 'audio/wav';
    return new NextResponse(sound.data, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(sound.data.length),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
