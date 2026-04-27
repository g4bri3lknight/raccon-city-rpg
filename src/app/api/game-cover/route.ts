import { NextRequest, NextResponse } from 'next/server';
import { getGameDb, listGameDbFiles } from '@/lib/game-db';

/**
 * GET /api/game-cover?gameId=xxx
 *
 * Serves the cover image for a game from that game's DB.
 * The cover image is stored in game_images with id = 'cover'.
 * Used by the dashboard to show game cards across multiple game DBs.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  if (!gameId || !listGameDbFiles().includes(gameId)) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  try {
    const client = getGameDb(gameId);
    const image = await client.gameImage.findUnique({ where: { id: 'cover' } });

    if (!image || !image.data || image.data.length < 8) {
      return NextResponse.json({ error: 'No cover image' }, { status: 404 });
    }

    const mimeType = image.mimeType || 'image/png';
    const buf = Buffer.from(image.data);

    // Validate image magic bytes to avoid serving corrupted data
    const isValid = (
      (buf[0] === 0x89 && buf[1] === 0x50) ||  // PNG
      (buf[0] === 0xff && buf[1] === 0xd8) ||  // JPEG
      (buf[0] === 0x52 && buf[1] === 0x49) ||  // WebP/RIFF
      (buf[0] === 0x47 && buf[1] === 0x49)     // GIF
    );
    if (!isValid) {
      console.warn(`[game-cover] Invalid image data for game ${gameId} (${image.data.length} bytes)`);
      return NextResponse.json({ error: 'Invalid cover image data' }, { status: 404 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buf.length),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error(`[GET /api/game-cover?gameId=${gameId}]`, error);
    return NextResponse.json({ error: 'Failed to load cover' }, { status: 500 });
  }
}
