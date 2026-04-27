/**
 * Download built portable file
 *
 * GET /api/admin/export-portable/download?buildId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync, createReadStream, statSync } from 'fs';
import { join, basename } from 'path';

export async function GET(req: NextRequest) {
  const buildId = req.nextUrl.searchParams.get('buildId');
  const fileName = req.nextUrl.searchParams.get('file');

  if (!fileName) {
    return NextResponse.json({ error: 'file è obbligatorio' }, { status: 400 });
  }

  // Only allow downloading known file types from dist-electron
  const allowedExts = ['.exe', '.AppImage', '.dmg', '.zip'];
  const ext = allowedExts.find(e => fileName.endsWith(e));
  if (!ext) {
    return NextResponse.json({ error: 'Tipo file non consentito' }, { status: 400 });
  }

  // Sanitize: no path traversal
  const safeName = basename(fileName);
  if (safeName !== fileName || safeName.includes('..')) {
    return NextResponse.json({ error: 'Nome file non valido' }, { status: 400 });
  }

  const filePath = join(process.cwd(), 'dist-electron', safeName);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File non trovato' }, { status: 404 });
  }

  try {
    const stat = statSync(filePath);

    const stream = createReadStream(filePath);
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        stream.on('end', () => controller.close());
        stream.on('error', (err: Error) => controller.error(err));
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': String(stat.size),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: `Errore lettura file: ${err}` }, { status: 500 });
  }
}
