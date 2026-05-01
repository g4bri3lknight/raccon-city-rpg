/**
 * Download built portable file
 *
 * GET /api/admin/export-portable/download?buildId=xxx&file=xxx
 *
 * Supports:
 *   1. Neutralinojs ZIP (neutralino/dist/BinaryName.zip) — primary
 *   2. Neutralinojs EXE (neutralino/dist/BinaryName/BinaryName.exe) — fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync, createReadStream, statSync, readdirSync } from 'fs';
import { join, basename } from 'path';

export async function GET(req: NextRequest) {
  const buildId = req.nextUrl.searchParams.get('buildId');
  const fileName = req.nextUrl.searchParams.get('file');

  if (!fileName) {
    return NextResponse.json({ error: 'file è obbligatorio' }, { status: 400 });
  }

  // Only allow downloading known file types
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

  const rootDir = process.cwd();
  let filePath = '';

  // 1. Neutralino ZIP: neutralino/dist/BinaryName.zip
  const neutralinoZip = join(rootDir, 'neutralino', 'dist', safeName);
  if (existsSync(neutralinoZip)) {
    filePath = neutralinoZip;
  }

  // 2. Neutralino structured EXE: neutralino/dist/BinaryName/BinaryName.exe
  if (!filePath) {
    const binaryName = safeName.replace(/\.[^.]+$/, '');
    const neutralinoExe = join(rootDir, 'neutralino', 'dist', binaryName, safeName);
    if (existsSync(neutralinoExe)) {
      filePath = neutralinoExe;
    }
  }

  // 3. Recursive search in neutralino/dist/
  if (!filePath) {
    const neutralinoDist = join(rootDir, 'neutralino', 'dist');
    if (existsSync(neutralinoDist)) {
      const findFile = (dir: string): string | null => {
        try {
          const entries = readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
              const found = findFile(full);
              if (found) return found;
            } else if (entry.name === safeName) {
              return full;
            }
          }
        } catch { /* ignore */ }
        return null;
      };
      const found = findFile(neutralinoDist);
      if (found) filePath = found;
    }
  }

  if (!filePath) {
    return NextResponse.json({ error: 'File non trovato' }, { status: 404 });
  }

  try {
    const stat = statSync(filePath);

    const stream = createReadStream(filePath);
    let closed = false;
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => {
          if (!closed) controller.enqueue(new Uint8Array(chunk));
        });
        stream.on('end', () => {
          if (!closed) { closed = true; controller.close(); }
        });
        stream.on('error', (err: Error) => {
          if (!closed) { closed = true; controller.error(err); }
        });
      },
      cancel() {
        if (!closed) { closed = true; stream.destroy(); }
      },
    });

    const downloadName = basename(filePath);

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': String(stat.size),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: `Errore lettura file: ${err}` }, { status: 500 });
  }
}
