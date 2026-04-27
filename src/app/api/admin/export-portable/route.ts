/**
 * Portable Export API
 *
 * POST /api/admin/export-portable  → Start a build (returns buildId)
 * GET  /api/admin/export-portable  → Poll build status
 *
 * Body (POST): { mode: 'game' | 'editor', gameId?: string }
 * Query (GET):  ?buildId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ── In-memory build tracker ──
interface BuildInfo {
  id: string;
  status: 'queued' | 'building' | 'done' | 'error';
  mode: 'game' | 'editor';
  gameId: string;
  output: string[];
  progress: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  startedAt: number;
  finishedAt?: number;
  errorCode?: number;
}

const builds = new Map<string, BuildInfo>();

// Cleanup old builds every 10 minutes (keep last 30 minutes)
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, build] of builds) {
    if (build.startedAt < cutoff && build.status !== 'building') {
      builds.delete(id);
    }
  }
}, 10 * 60 * 1000);

function findOutputFile(): { path: string; name: string; size: number } | null {
  const distDir = join(process.cwd(), 'dist-electron');
  if (!existsSync(distDir)) return null;

  try {
    const files = readdirSync(distDir);
    const candidates = files.filter(f =>
      f.endsWith('.exe') ||
      f.endsWith('.AppImage') ||
      f.endsWith('.dmg') ||
      f.endsWith('.zip')
    );

    if (candidates.length === 0) return null;

    // Pick the most recently modified
    let newest = candidates[0];
    let newestTime = 0;

    for (const f of candidates) {
      try {
        const st = statSync(join(distDir, f));
        if (st.mtimeMs > newestTime) {
          newestTime = st.mtimeMs;
          newest = f;
        }
      } catch { /* skip */ }
    }

    const filePath = join(distDir, newest);
    const st = statSync(filePath);
    return { path: filePath, name: newest, size: st.size };
  } catch {
    return null;
  }
}

function startBuild(buildId: string, mode: 'game' | 'editor', gameId: string) {
  const build = builds.get(buildId)!;
  build.status = 'building';
  build.progress = 'Avvio del processo di build...';

  const args = mode === 'game'
    ? ['scripts/build-portable.js', `--game=${gameId}`]
    : ['scripts/build-portable.js', '--editor'];

  const proc = spawn('node', args, {
    cwd: process.cwd(),
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (data: Buffer) => {
    const text = data.toString();
    stdout += text;
    const lines = text.split('\n').filter(l => l.trim());
    build.output.push(...lines);
    // Keep last 200 lines
    if (build.output.length > 200) {
      build.output = build.output.slice(-200);
    }
    // Track progress from known step markers
    for (const line of lines) {
      if (line.includes('Step 1/')) build.progress = 'Build Next.js (step 1/5)...';
      else if (line.includes('Step 2/')) build.progress = 'Copia asset statici (step 2/5)...';
      else if (line.includes('Step 3/')) build.progress = 'Copia database (step 3/5)...';
      else if (line.includes('Step 4/')) build.progress = 'Verifica Prisma (step 4/5)...';
      else if (line.includes('Step 5/')) build.progress = 'Creazione eseguibile (step 5/5)...';
      else if (line.includes('electron-builder')) build.progress = 'Packaging con electron-builder...';
    }
  });

  proc.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
    const lines = data.toString().split('\n').filter(l => l.trim());
    build.output.push(...lines);
    if (build.output.length > 200) {
      build.output = build.output.slice(-200);
    }
  });

  proc.on('error', (err) => {
    build.status = 'error';
    build.progress = `Errore: ${err.message}`;
    build.output.push(`ERRORE PROCESSO: ${err.message}`);
    build.finishedAt = Date.now();
  });

  proc.on('close', (code) => {
    build.errorCode = code ?? undefined;
    build.finishedAt = Date.now();

    if (code === 0) {
      const output = findOutputFile();
      if (output) {
        build.status = 'done';
        build.filePath = output.path;
        build.fileName = output.name;
        build.fileSize = output.size;
        build.progress = 'Build completato!';
      } else {
        build.status = 'error';
        build.progress = 'Build terminato ma nessun file trovato in dist-electron/';
      }
    } else {
      build.status = 'error';
      build.progress = `Build fallito (codice ${code})`;
    }
  });
}

// ── POST: Start a new build ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: string = body.mode;
    const gameId: string = body.gameId || '';

    if (mode !== 'game' && mode !== 'editor') {
      return NextResponse.json({ error: 'mode deve essere "game" o "editor"' }, { status: 400 });
    }
    if (mode === 'game' && !gameId) {
      return NextResponse.json({ error: 'gameId è obbligatorio per mode="game"' }, { status: 400 });
    }

    const buildId = randomUUID();
    builds.set(buildId, {
      id: buildId,
      status: 'queued',
      mode: mode as 'game' | 'editor',
      gameId,
      output: [],
      progress: 'In coda...',
      filePath: '',
      fileName: '',
      fileSize: 0,
      startedAt: Date.now(),
    });

    // Start build asynchronously (small delay to let the response go out)
    setTimeout(() => startBuild(buildId, mode as 'game' | 'editor', gameId), 100);

    return NextResponse.json({ buildId });
  } catch (err) {
    return NextResponse.json({ error: `Errore: ${err}` }, { status: 500 });
  }
}

// ── GET: Poll build status ──
export async function GET(req: NextRequest) {
  const buildId = req.nextUrl.searchParams.get('buildId');

  if (!buildId) {
    return NextResponse.json({ error: 'buildId è obbligatorio' }, { status: 400 });
  }

  const build = builds.get(buildId);
  if (!build) {
    return NextResponse.json({ error: 'Build non trovato' }, { status: 404 });
  }

  const elapsed = Math.round((Date.now() - build.startedAt) / 1000);
  const elapsedStr = elapsed >= 60
    ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
    : `${elapsed}s`;

  return NextResponse.json({
    status: build.status,
    mode: build.mode,
    gameId: build.gameId,
    progress: build.progress,
    logs: build.output.slice(-30), // last 30 lines
    fileName: build.fileName || null,
    fileSize: build.fileSize || null,
    elapsed: elapsedStr,
  });
}
