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
  const rootDir = process.cwd();

  // 1. Try Neutralino ZIP output: neutralino/dist/BinaryName.zip (primary distributable)
  const neutralinoDist = join(rootDir, 'neutralino', 'dist');
  if (existsSync(neutralinoDist)) {
    // First: look for full package .zip (BinaryName.zip, NOT BinaryName-binaries.zip)
    const fullZipFound = findNewestFile(neutralinoDist, '.zip', true, '-binaries.zip');
    if (fullZipFound) return fullZipFound;

    // Fallback: any .zip (including binaries-only)
    const zipFound = findNewestFile(neutralinoDist, '.zip');
    if (zipFound) return zipFound;

    // Fallback: any .exe in Neutralino dist (shouldn't happen with new build)
    const exeFound = findNewestFile(neutralinoDist, '.exe', true);
    if (exeFound) return exeFound;
  }

  // 2. Fallback: legacy Electron output
  const distDir = join(rootDir, 'dist-electron');
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

/** Find the newest file with given extension in a directory (optionally recursive) */
function findNewestFile(dir: string, ext: string, recursive = false, excludeSuffix?: string): { path: string; name: string; size: number } | null {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    let newest: { path: string; name: string; size: number; mtime: number } | null = null;

    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && recursive) {
        const found = findNewestFile(full, ext, true, excludeSuffix);
        if (found) {
          const st = statSync(found.path);
          if (!newest || st.mtimeMs > newest.mtime) {
            newest = { ...found, mtime: st.mtimeMs };
          }
        }
      } else if (entry.name.endsWith(ext) && !(excludeSuffix && entry.name.endsWith(excludeSuffix))) {
        const st = statSync(full);
        if (!newest || st.mtimeMs > newest.mtime) {
          newest = { path: full, name: entry.name, size: st.size, mtime: st.mtimeMs };
        }
      }
    }

    return newest ? { path: newest.path, name: newest.name, size: newest.size } : null;
  } catch {
    return null;
  }
}



function startBuild(buildId: string, mode: 'game' | 'editor', gameId: string, gameName: string, platform: string) {
  const build = builds.get(buildId)!;
  build.status = 'building';
  build.progress = 'Avvio del processo di build...';

  const args = mode === 'game'
    ? ['scripts/build-portable.js', `--game=${gameId}`]
    : ['scripts/build-portable.js', '--editor'];

  // Add --name for dynamic productName in the EXE
  if (mode === 'game' && gameName) {
    args.push(`--name=${gameName}`);
  }

  // Add --platform for target platform (win/mac/linux)
  if (platform) {
    args.push(`--platform=${platform}`);
  }

  // Clean environment: strip ALL dev-server variables so `next build`
  // runs in a clean context (no PORT, no TURBOPACK, no NEXT_*, etc.)
  const cleanEnv: Record<string, string | undefined> = {};
  const skipPrefixes = [
    'NEXT_',        // NEXT_PUBLIC_*, NEXT_PRIVATE_*, etc.
    'PORT',         // PORT=3000 (dev server port) — THIS WAS THE BUG: was 'PORT=' which never matched
    'HOSTNAME',     // HOSTNAME=0.0.0.0 (dev server host)
    'TURBOPACK',    // TURBOPACK=1 (dev server engine)
    '__NEXT',       // __NEXT_PRIVATE_* (internal Next.js runtime vars)
    'NODE_ENV',     // dev server sets "development" — build needs "production"
    'NODE_OPTIONS', // reset below with clean value
    'WATCHPACK',    // WATCHPACK_* (file watcher, conflicts with build)
    'BROWSER',      // BROWSER=none (dev server auto-open)
  ];
  for (const [key, value] of Object.entries(process.env)) {
    const shouldSkip = skipPrefixes.some(p => key.startsWith(p));
    if (!shouldSkip) {
      cleanEnv[key] = value;
    }
  }
  // Set clean essential vars
  cleanEnv.NODE_ENV = 'production';
  cleanEnv.NODE_OPTIONS = '--max-old-space-size=4096';
  cleanEnv.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

  const proc = spawn('node', args, {
    cwd: process.cwd(),
    env: cleanEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
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
      if (line.includes('Step 1/')) build.progress = 'Verifica prerequisiti (step 1/6)...';
      else if (line.includes('Step 2/')) build.progress = 'Compilazione Next.js (step 2/6)...';
      else if (line.includes('Step 3/')) build.progress = 'Copia asset statici (step 3/6)...';
      else if (line.includes('Step 4/')) build.progress = 'Copia database di gioco (step 4/6)...';
      else if (line.includes('Step 5/')) build.progress = 'Preparazione risorse Neutralino (step 5/6)...';
      else if (line.includes('Step 6/')) build.progress = 'Creazione eseguibile portatile (step 6/6)...';
      else if (line.includes('neu build')) build.progress = 'Packaging con Neutralinojs...';
      else if (line.includes('Downloading Node.js')) build.progress = 'Download runtime Node.js...';
      else if (line.includes('Compiled successfully')) build.progress = 'Compilazione riuscita, generazione pagine...';
      else if (line.includes('standalone build complete')) build.progress = 'Build Next.js completato!';
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
        build.progress = 'Build terminato ma nessun file trovato';
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
    const gameName: string = body.gameName || '';
    const platform: string = body.platform || 'win';

    if (mode !== 'game' && mode !== 'editor') {
      return NextResponse.json({ error: 'mode deve essere "game" o "editor"' }, { status: 400 });
    }
    if (mode === 'game' && !gameId) {
      return NextResponse.json({ error: 'gameId è obbligatorio per mode="game"' }, { status: 400 });
    }
    if (platform && !['win', 'mac', 'linux'].includes(platform)) {
      return NextResponse.json({ error: 'platform deve essere "win", "mac" o "linux"' }, { status: 400 });
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
    setTimeout(() => startBuild(buildId, mode as 'game' | 'editor', gameId, gameName, platform), 100);

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
    logs: build.output.slice(-80), // last 80 lines for better error diagnosis
    fileName: build.fileName || null,
    fileSize: build.fileSize || null,
    elapsed: elapsedStr,
  });
}
