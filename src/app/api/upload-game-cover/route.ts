import { NextRequest, NextResponse } from 'next/server';
import { getGameDb, listGameDbFiles } from '@/lib/game-db';

/** Check if buffer starts with a valid image magic number */
function isValidImageMagic(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // WebP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf.length >= 12) {
    return buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
  }
  // GIF: GIF8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  return false;
}

/**
 * POST /api/upload-game-cover
 *
 * Uploads a cover image for a game. The image is stored in the
 * game's own DB (game_images table) with id = 'cover'.
 *
 * Body: FormData with:
 *   - gameId: string
 *   - file: File (image)
 *
 * Also updates the Game record's coverImage field to 'cover'.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const gameId = formData.get('gameId') as string;
    const file = formData.get('file') as File | null;

    if (!gameId || !listGameDbFiles().includes(gameId)) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!file || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Valid image file required' }, { status: 400 });
    }

    // Limit file size to 2MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 2MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate actual image content (not just MIME type)
    if (!isValidImageMagic(buffer)) {
      return NextResponse.json({ error: 'Invalid image format (corrupted or not an image)' }, { status: 400 });
    }

    const client = getGameDb(gameId);

    // Upsert the cover image in game_images
    await client.gameImage.upsert({
      where: { id: 'cover' },
      update: {
        data: buffer,
        mimeType: file.type,
        name: `Cover: ${gameId}`,
        refKey: 'cover',
        category: 'cover',
      },
      create: {
        id: 'cover',
        data: buffer,
        mimeType: file.type,
        name: `Cover: ${gameId}`,
        refKey: 'cover',
        category: 'cover',
      },
    });

    // Update Game record's coverImage field
    await client.game.updateMany({
      data: { coverImage: 'cover' },
    });

    return NextResponse.json({
      success: true,
      message: 'Cover image uploaded',
      gameId,
    });
  } catch (error) {
    console.error('[POST /api/upload-game-cover]', error);
    return NextResponse.json({ error: 'Failed to upload cover' }, { status: 500 });
  }
}

/**
 * DELETE /api/upload-game-cover?gameId=xxx
 *
 * Removes the cover image for a game.
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  if (!gameId || !listGameDbFiles().includes(gameId)) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  try {
    const client = getGameDb(gameId);

    // Delete the cover image
    await client.gameImage.deleteMany({ where: { id: 'cover' } });

    // Clear the coverImage field on Game record
    await client.game.updateMany({
      data: { coverImage: '' },
    });

    return NextResponse.json({
      success: true,
      message: 'Cover image removed',
      gameId,
    });
  } catch (error) {
    console.error(`[DELETE /api/upload-game-cover?gameId=${gameId}]`, error);
    return NextResponse.json({ error: 'Failed to remove cover' }, { status: 500 });
  }
}
