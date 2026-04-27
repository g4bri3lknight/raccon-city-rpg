#!/usr/bin/env node

/**
 * Build Script — RPG Game Portable Export
 *
 * Usage:
 *   node scripts/build-portable.js --game=GAME_ID    → single game
 *   node scripts/build-portable.js --editor           → full editor + all games
 *
 * This script:
 *   1. Runs `next build` (produces .next/standalone/)
 *   2. Copies static assets and public into standalone
 *   3. Copies the relevant game DB(s) into standalone/db/games/
 *   4. Sets up electron-builder config
 *   5. Runs electron-builder to create the portable executable
 */

const { execSync, cpSync, mkdirSync, existsSync, writeFileSync, readFileSync, rmSync, readdirSync } = require('fs');
const { join, dirname } = require('path');
const { argv, env } = require('process');

// ── Parse Args ──
const args = argv.slice(2);
const gameArg = args.find(a => a.startsWith('--game='));
const isEditor = args.includes('--editor');
const gameId = gameArg ? gameArg.split('=')[1] : null;
const isGameOnly = !!gameId;

if (!isGameOnly && !isEditor) {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   RPG Game — Portable Build Tool             ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log('  ║                                              ║');
  console.log('  ║  Usage:                                      ║');
  console.log('  ║    node scripts/build-portable.js \\           ║');
  console.log('  ║      --game=GAME_ID    Single game export    ║');
  console.log('  ║    node scripts/build-portable.js \\           ║');
  console.log('  ║      --editor         Full editor export     ║');
  console.log('  ║                                              ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  process.exit(1);
}

const projectName = isGameOnly
  ? `RPG-${gameId}`
  : 'RPG-Game-Editor';

console.log('');
console.log(`  🎮 Building: ${projectName}`);
console.log(`  Mode: ${isGameOnly ? `Game-only (${gameId})` : 'Full Editor'}`);
console.log('');

const ROOT = process.cwd();
const STANDALONE_DIR = join(ROOT, '.next', 'standalone');
const GAMES_DIR = join(ROOT, 'db', 'games');

// ── Step 1: Next.js Build ──
console.log('  ── Step 1/5: Building Next.js (standalone)...');
try {
  execSync('npx next build', {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...env, NODE_OPTIONS: '--max-old-space-size=4096' },
  });
} catch (err) {
  console.error('  ❌ Next.js build failed!');
  process.exit(1);
}

// ── Step 2: Copy Static Assets ──
console.log('  ── Step 2/5: Copying static assets...');

// Copy .next/static into standalone
const staticFrom = join(ROOT, '.next', 'static');
const staticTo = join(STANDALONE_DIR, '.next', 'static');
if (existsSync(staticFrom)) {
  if (existsSync(staticTo)) rmSync(staticTo, { recursive: true });
  cpSync(staticFrom, staticTo, { recursive: true });
  console.log('  ✅ Copied .next/static');
}

// Copy public into standalone
const publicFrom = join(ROOT, 'public');
const publicTo = join(STANDALONE_DIR, 'public');
if (existsSync(publicFrom)) {
  if (existsSync(publicTo)) rmSync(publicTo, { recursive: true });
  cpSync(publicFrom, publicTo, { recursive: true });
  console.log('  ✅ Copied public/');
}

// ── Step 3: Copy Game DB(s) ──
console.log('  ── Step 3/5: Copying game database(s)...');

const standaloneDbDir = join(STANDALONE_DIR, 'db', 'games');
if (!existsSync(standaloneDbDir)) {
  mkdirSync(standaloneDbDir, { recursive: true });
}

if (isGameOnly) {
  // Copy only the specified game DB
  const gameDb = join(GAMES_DIR, `${gameId}.db`);
  if (!existsSync(gameDb)) {
    console.error(`  ❌ Game DB not found: ${gameDb}`);
    console.error('  Make sure the game exists before exporting.');
    process.exit(1);
  }
  cpSync(gameDb, join(standaloneDbDir, `${gameId}.db`));
  console.log(`  ✅ Copied: ${gameId}.db`);

  // Set active game
  const standaloneDbBase = join(STANDALONE_DIR, 'db');
  if (!existsSync(standaloneDbBase)) mkdirSync(standaloneDbBase, { recursive: true });
  writeFileSync(join(standaloneDbBase, '.active-game'), gameId, 'utf-8');
  console.log(`  ✅ Active game set: ${gameId}`);
} else {
  // Copy ALL game DBs
  if (existsSync(GAMES_DIR)) {
    const dbs = readdirSync(GAMES_DIR).filter(f => f.endsWith('.db'));
    for (const db of dbs) {
      cpSync(join(GAMES_DIR, db), join(standaloneDbDir, db));
      console.log(`  ✅ Copied: ${db}`);
    }
    if (dbs.length === 0) {
      console.log('  ⚠️  No game databases found!');
    }
  }
  // Copy active game file
  const activeFile = join(ROOT, 'db', '.active-game');
  const standaloneActive = join(STANDALONE_DIR, 'db', '.active-game');
  if (existsSync(activeFile)) {
    const standaloneActiveDir = dirname(standaloneActive);
    if (!existsSync(standaloneActiveDir)) mkdirSync(standaloneActiveDir, { recursive: true });
    cpSync(activeFile, standaloneActive);
    console.log('  ✅ Copied .active-game');
  }
}

// ── Step 4: Verify Prisma Engine ──
console.log('  ── Step 4/5: Verifying Prisma setup...');

const prismaDir = join(ROOT, 'node_modules', '.prisma');
if (!existsSync(prismaDir)) {
  console.warn('  ⚠️  Prisma engine not found. Running prisma generate...');
  try {
    execSync('npx prisma generate', { cwd: ROOT, stdio: 'inherit' });
  } catch {
    console.error('  ❌ Prisma generate failed!');
    process.exit(1);
  }
}
console.log('  ✅ Prisma engine ready');

// ── Step 5: Run electron-builder ──
console.log('  ── Step 5/5: Building portable executable...');
console.log('');

// Check if electron-builder is available
try {
  require('electron-builder');
} catch {
  console.error('  ❌ electron-builder is not installed!');
  console.error('');
  console.error('  Install it with:');
  console.error('    bun add -D electron electron-builder');
  console.error('');
  process.exit(1);
}

try {
  const platform = process.platform;
  let targetFlag = '';
  if (platform === 'win32') targetFlag = '--win';
  else if (platform === 'darwin') targetFlag = '--mac';
  else targetFlag = '--linux';

  execSync(
    `npx electron-builder --config electron-builder.yml --publish never ${targetFlag}`,
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...env,
        GAME_ONLY: isGameOnly ? 'true' : 'false',
        GAME_ID: gameId || '',
      },
    }
  );
} catch (err) {
  console.error('  ❌ electron-builder failed!');
  process.exit(1);
}

console.log('');
console.log(`  ✅ Build complete: ${projectName}`);
console.log(`  📦 Output: dist-electron/`);
console.log('');
