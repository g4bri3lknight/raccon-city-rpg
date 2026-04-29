#!/usr/bin/env node

/**
 * Build Script — RPG Game Portable Export
 *
 * Usage:
 *   npm run export:game GAME_ID       → single game (build + package)
 *   npm run export:editor             → full editor + all games
 *   node scripts/build-portable.js --game=ID --no-build  → package only (skip next build)
 *
 * The --no-build flag is used by the web UI to skip `next build`
 * (avoids conflicts with the running dev server).
 * When --no-build is used, .next/standalone must already exist.
 *
 * Steps:
 *   1. Pre-flight checks (electron-builder, DBs, config)
 *   2. Run `next build` (standalone output) — SKIPPED with --no-build
 *   3. Copy static assets into standalone
 *   4. Copy game DB(s) into standalone
 *   5. Run electron-builder → portable executable
 */

const { execSync, cpSync, mkdirSync, existsSync, writeFileSync, readFileSync, unlinkSync, readdirSync, statSync, rmSync } = require('fs');
const { join, dirname, resolve } = require('path');
const { argv, env, exit } = require('process');
const { spawn } = require('child_process');

// ═══════════════════════════════════════════════════════════
//  ARG PARSING
// ═══════════════════════════════════════════════════════════

const args = argv.slice(2);

function findArg(args, flag) {
  const eqArg = args.find(a => a.startsWith(`--${flag}=`));
  if (eqArg) { const v = eqArg.split('=').slice(1).join('='); if (v) return v; }
  const idx = args.indexOf(`--${flag}`);
  if (idx !== -1 && idx + 1 < args.length) {
    const v = args[idx + 1];
    if (v && !v.startsWith('--')) return v;
  }
  return null;
}

const gameId = findArg(args, 'game');
const customName = findArg(args, 'name');
const isEditor = args.includes('--editor');
const isGameOnly = !!gameId;
const skipBuild = args.includes('--no-build');

if (!isGameOnly && !isEditor) {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   RPG Game — Portable Build Tool             ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log('  ║                                              ║');
  console.log('  ║  Usage:                                      ║');
  console.log('  ║    npm run export:game <GAME_ID>              ║');
  console.log('  ║    npm run export:editor                     ║');
  console.log('  ║                                              ║');
  console.log('  ║  Flags:                                      ║');
  console.log('  ║    --name="Display Name"  custom EXE name     ║');
  console.log('  ║    --no-build           skip next build       ║');
  console.log('  ║                                              ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  exit(1);
}

// productName: the display name shown in the EXE/window title
const productName = customName || (isGameOnly
  ? `RPG ${gameId}`
  : 'RPG Game Editor');

const projectName = isGameOnly
  ? `RPG-${gameId}`
  : 'RPG-Game-Editor';

console.log('');
console.log(`  🎮 Building: ${projectName}`);
console.log(`  📛 Product Name: ${productName}`);
console.log(`  📦 Mode: ${isGameOnly ? `Game-only (${gameId})` : 'Full Editor'}`);
if (skipBuild) console.log(`  ⏭️  Skipping Next.js build (--no-build)`);
console.log('');

const ROOT = process.cwd();
const STANDALONE_DIR = join(ROOT, '.next', 'standalone');
const GAMES_DIR = join(ROOT, 'db', 'games');

// ═══════════════════════════════════════════════════════════
//  HELPER: Run command with real-time output + error capture
// ═══════════════════════════════════════════════════════════

function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const { cwd = ROOT, extraEnv = {} } = options;

    const childEnv = {
      ...env,
      ...extraEnv,
    };

    // Build a single command string and use shell:true for cross-platform support.
    // Windows needs shell:true to resolve .cmd wrappers (npx.cmd, electron-builder.cmd).
    const cmdString = 'npx ' + [command, ...commandArgs].map(a => {
      // Quote args that contain spaces
      if (a.includes(' ')) return `"${a}"`;
      return a;
    }).join(' ');

    const child = spawn(cmdString, [], {
      cwd,
      env: childEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    // Capture output for error reporting
    const outputLines = [];
    const MAX_LINES = 200;

    child.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      const newLines = text.split('\n');
      for (const line of newLines) {
        if (line.trim()) outputLines.push(line);
      }
      while (outputLines.length > MAX_LINES) {
        outputLines.shift();
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      const newLines = text.split('\n');
      for (const line of newLines) {
        if (line.trim()) outputLines.push(line);
      }
      while (outputLines.length > MAX_LINES) {
        outputLines.shift();
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start command "${command}": ${err.message}`));
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve(outputLines.join('\n'));
      } else {
        const errorDetail = code
          ? `Exit code: ${code}`
          : `Killed by signal: ${signal}`;
        reject(new Error(
          `${errorDetail}\n\n` +
          `── Command output (last 80 lines): ──\n` +
          outputLines.slice(-80).join('\n') +
          '\n── End of output ──'
        ));
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  HELPER: Generate electron-builder config with dynamic productName
// ═══════════════════════════════════════════════════════════

function generateBuilderConfig() {
  // Read the base YAML and replace productName
  const baseYaml = readFileSync(join(ROOT, 'electron-builder.yml'), 'utf-8');
  // Replace the productName line (YAML: simple scalar or quoted string)
  const newYaml = baseYaml.replace(
    /^productName:\s*.*/m,
    `productName: ${JSON.stringify(productName)}`
  );
  // Write a temp config file
  const tempConfig = join(ROOT, '.electron-builder-build.yml');
  writeFileSync(tempConfig, newYaml, 'utf-8');
  return tempConfig;
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════

(async () => {

// ═══════════════════════════════════════════════════════════
//  STEP 1: PRE-FLIGHT CHECKS
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 1/5: Pre-flight checks...');

// 1a. electron-builder
try {
  require('electron-builder');
  console.log('  ✅ electron-builder found');
} catch {
  console.error('  ❌ electron-builder is not installed!');
  console.error('');
  console.error('  Install it with:');
  console.error('    npm install -D electron electron-builder');
  console.error('    (or: bun add -D electron electron-builder)');
  console.error('');
  exit(1);
}

// 1b. electron-builder.yml config
if (!existsSync(join(ROOT, 'electron-builder.yml'))) {
  console.error('  ❌ electron-builder.yml not found!');
  exit(1);
}
console.log('  ✅ electron-builder.yml found');

// 1c. Game DB
if (isGameOnly) {
  const gameDb = join(GAMES_DIR, `${gameId}.db`);
  if (!existsSync(gameDb)) {
    console.error(`  ❌ Game DB not found: ${gameDb}`);
    console.error('  Make sure the game exists before exporting.');
    exit(1);
  }
  console.log(`  ✅ Game DB found: ${gameId}.db`);
} else {
  if (!existsSync(GAMES_DIR)) {
    console.error(`  ❌ Games directory not found: ${GAMES_DIR}`);
    exit(1);
  }
  const dbs = readdirSync(GAMES_DIR).filter(f => f.endsWith('.db'));
  if (dbs.length === 0) {
    console.error('  ❌ No game databases found in db/games/');
    exit(1);
  }
  console.log(`  ✅ Found ${dbs.length} game database(s)`);
}

// 1d. Prisma engine
const prismaDir = join(ROOT, 'node_modules', '.prisma');
if (!existsSync(prismaDir)) {
  console.warn('  ⚠️  Prisma engine not found. Running prisma generate...');
  try {
    execSync('npx prisma generate', { cwd: ROOT, stdio: 'inherit' });
    console.log('  ✅ Prisma engine generated');
  } catch {
    console.error('  ❌ Prisma generate failed!');
    exit(1);
  }
} else {
  console.log('  ✅ Prisma engine ready');
}

// 1e. electron/ directory
if (!existsSync(join(ROOT, 'electron', 'main.js'))) {
  console.error('  ❌ electron/main.js not found!');
  exit(1);
}
console.log('  ✅ Electron main.js found');

console.log('  ✅ All pre-flight checks passed');

// ═══════════════════════════════════════════════════════════
//  STEP 2: NEXT.JS BUILD (skipped with --no-build)
// ═══════════════════════════════════════════════════════════

if (skipBuild) {
  console.log('  ── Step 2/5: Skipping Next.js build (--no-build)...');

  // Verify standalone already exists
  if (!existsSync(join(STANDALONE_DIR, 'server.js'))) {
    console.error('');
    console.error('  ❌ .next/standalone/server.js not found!');
    console.error('');
    console.error('  The --no-build flag requires a pre-existing build.');
    console.error('  Run this command first from the terminal:');
    console.error('');
    console.error('    npm run build');
    console.error('');
    exit(1);
  }
  console.log('  ✅ Using existing standalone build');
} else {
  console.log('  ── Step 2/5: Building Next.js (standalone)...');
  console.log('');

  // Retry loop — Next.js 16.x ha un bug non-deterministico di prerender
  // (useContext null durante /_global-error SSG). Il retry spesso lo risolve.
  const MAX_BUILD_RETRIES = 3;
  let buildOk = false;
  for (let attempt = 1; attempt <= MAX_BUILD_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`  🔄 Retry ${attempt}/${MAX_BUILD_RETRIES}...`);
      }
      await runCommand('next', ['build'], {
        cwd: ROOT,
        extraEnv: {
          NODE_OPTIONS: (env.NODE_OPTIONS || '') + ' --max-old-space-size=4096',
        },
      });
      buildOk = true;
      break;
    } catch (err) {
      const msg = String(err.message || '');
      const isPrerenderBug = msg.includes('useContext') || msg.includes('useState') || msg.includes('prerender');
      if (isPrerenderBug && attempt < MAX_BUILD_RETRIES) {
        console.log(`  ⚠️  Next.js prerender bug detected — retrying...`);
        continue;
      }
      console.error('');
      console.error('  ══════════════════════════════════════════════');
      console.error('  ❌ Next.js build failed!');
      console.error('');
      console.error('  ' + err.message);
      console.error('');
      console.error('  Common causes:');
      console.error('  • Out of memory → set NODE_OPTIONS="--max-old-space-size=8192"');
      console.error('  • Missing dependency → run npm install');
      console.error('  • TypeScript error → next.config.ts has ignoreBuildErrors: true');
      console.error('  • Missing .env → check .env file exists in project root');
      console.error('  ══════════════════════════════════════════════');
      console.error('');
      exit(1);
    }
  }
  if (!buildOk) exit(1);

  // Verify standalone was created
  if (!existsSync(join(STANDALONE_DIR, 'server.js'))) {
    console.error('  ❌ Standalone build not found at .next/standalone/server.js');
    console.error('  Make sure next.config.ts has: output: "standalone"');
    exit(1);
  }
  console.log('');
  console.log('  ✅ Next.js standalone build complete');
}

// ═══════════════════════════════════════════════════════════
//  STEP 3: COPY STATIC ASSETS
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 3/5: Copying static assets...');

// Copy .next/static into standalone/.next/static
const staticFrom = join(ROOT, '.next', 'static');
const staticTo = join(STANDALONE_DIR, '.next', 'static');
if (existsSync(staticFrom)) {
  if (existsSync(staticTo)) rmSync(staticTo, { recursive: true });
  mkdirSync(dirname(staticTo), { recursive: true });
  cpSync(staticFrom, staticTo, { recursive: true });
  console.log('  ✅ Copied .next/static');
} else {
  console.warn('  ⚠️  .next/static not found (may cause missing assets)');
}

// Copy public/ into standalone/public/
const publicFrom = join(ROOT, 'public');
const publicTo = join(STANDALONE_DIR, 'public');
if (existsSync(publicFrom)) {
  if (existsSync(publicTo)) rmSync(publicTo, { recursive: true });
  cpSync(publicFrom, publicTo, { recursive: true });
  console.log('  ✅ Copied public/');
}

// Copy prisma engine into standalone for runtime DB access
const prismaNodeModules = join(ROOT, 'node_modules', '.prisma');
const standalonePrisma = join(STANDALONE_DIR, 'node_modules', '.prisma');
if (existsSync(prismaNodeModules)) {
  if (existsSync(standalonePrisma)) rmSync(standalonePrisma, { recursive: true });
  mkdirSync(dirname(standalonePrisma), { recursive: true });
  cpSync(prismaNodeModules, standalonePrisma, { recursive: true });
  console.log('  ✅ Copied Prisma engine');
}

// Ensure @prisma/client is in standalone node_modules
const packagesToCopy = ['@prisma/client', '@prisma/engines'];
for (const pkg of packagesToCopy) {
  const from = join(ROOT, 'node_modules', pkg);
  const to = join(STANDALONE_DIR, 'node_modules', pkg);
  if (existsSync(from) && !existsSync(to)) {
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true });
    console.log(`  ✅ Copied ${pkg}`);
  } else if (existsSync(to)) {
    console.log(`  ✅ ${pkg} already in standalone`);
  }
}

// Copy prisma/schema.prisma
const schemaFrom = join(ROOT, 'prisma', 'schema.prisma');
const schemaTo = join(STANDALONE_DIR, 'prisma', 'schema.prisma');
if (existsSync(schemaFrom)) {
  if (existsSync(dirname(schemaTo))) rmSync(dirname(schemaTo), { recursive: true });
  mkdirSync(dirname(schemaTo), { recursive: true });
  cpSync(schemaFrom, schemaTo);
  console.log('  ✅ Copied prisma/schema.prisma');
}

// ═══════════════════════════════════════════════════════════
//  STEP 4: COPY GAME DATABASE(S)
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 4/5: Copying game database(s)...');

// Ensure standalone db dirs exist
const standaloneDbGames = join(STANDALONE_DIR, 'db', 'games');
const standaloneDbBase = join(STANDALONE_DIR, 'db');
mkdirSync(standaloneDbGames, { recursive: true });

if (isGameOnly) {
  // Copy the game DB
  const gameDb = join(GAMES_DIR, `${gameId}.db`);
  cpSync(gameDb, join(standaloneDbGames, `${gameId}.db`));
  console.log(`  ✅ Copied: ${gameId}.db (${(statSync(gameDb).size / 1024 / 1024).toFixed(1)} MB)`);

  // Copy editor DB (custom.db) for save/load support
  const editorDb = join(ROOT, 'db', 'custom.db');
  if (existsSync(editorDb)) {
    cpSync(editorDb, join(standaloneDbBase, 'custom.db'));
    console.log('  ✅ Copied: custom.db (editor DB)');
  }

  // Set active game
  writeFileSync(join(standaloneDbBase, '.active-game'), gameId, 'utf-8');
  console.log(`  ✅ Active game set: ${gameId}`);

  // Write game config for Electron — this is the SOLE source of truth
  // for the packaged EXE (no CLI args at runtime)
  const gameConfig = {
    productName: productName,
    gameId: gameId,
    isGameOnly: true,
  };
  writeFileSync(join(STANDALONE_DIR, 'game-config.json'), JSON.stringify(gameConfig, null, 2), 'utf-8');
  console.log(`  ✅ Game config written → ${productName} (game-only mode)`);
} else {
  // Copy ALL game DBs
  const dbs = readdirSync(GAMES_DIR).filter(f => f.endsWith('.db'));
  for (const db of dbs) {
    const src = join(GAMES_DIR, db);
    cpSync(src, join(standaloneDbGames, db));
    console.log(`  ✅ Copied: ${db} (${(statSync(src).size / 1024 / 1024).toFixed(1)} MB)`);
  }

  // Copy active game file
  const activeFile = join(ROOT, 'db', '.active-game');
  if (existsSync(activeFile)) {
    cpSync(activeFile, join(standaloneDbBase, '.active-game'));
    console.log('  ✅ Copied .active-game');
  }

  // Copy editor DB
  const editorDb = join(ROOT, 'db', 'custom.db');
  if (existsSync(editorDb)) {
    cpSync(editorDb, join(standaloneDbBase, 'custom.db'));
    console.log('  ✅ Copied: custom.db (editor DB)');
  }

  // Write editor config for Electron
  const editorConfig = {
    productName: productName,
    gameId: null,
    isGameOnly: false,
  };
  writeFileSync(join(STANDALONE_DIR, 'game-config.json'), JSON.stringify(editorConfig, null, 2), 'utf-8');
  console.log(`  ✅ Game config written → ${productName} (editor mode)`);
}

// ═══════════════════════════════════════════════════════════
//  STEP 5: ELECTRON-BUILDER
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 5/5: Building portable executable...');
console.log('');

const platform = process.platform;
let targetFlag = '';
if (platform === 'win32') targetFlag = '--win';
else if (platform === 'darwin') targetFlag = '--mac';
else targetFlag = '--linux';

console.log(`  Platform: ${platform} ${targetFlag}`);
console.log(`  Product Name: ${productName}`);
console.log('');

// Generate temp config with the correct productName
let tempConfigPath = null;
try {
  tempConfigPath = generateBuilderConfig();
  console.log(`  Config: ${tempConfigPath} (productName: "${productName}")`);

  await runCommand('electron-builder', [
    '--config', tempConfigPath,
    '--publish', 'never',
    targetFlag,
  ], {
    cwd: ROOT,
    extraEnv: {
      GAME_ONLY: isGameOnly ? 'true' : 'false',
      GAME_ID: gameId || '',
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    },
  });
} catch (err) {
  console.error('');
  console.error('  ══════════════════════════════════════════════');
  console.error('  ❌ electron-builder failed!');
  console.error('');
  console.error('  ' + err.message);
  console.error('');
  console.error('  Common causes:');
  console.error('  • Missing icon → build/icon.png');
  console.error('  • electron-builder.yml syntax error');
  console.error('  • Insufficient disk space');
  console.error('  ══════════════════════════════════════════════');
  console.error('');
  exit(1);
} finally {
  // Clean up temp config
  if (tempConfigPath) {
    try { unlinkSync(tempConfigPath); } catch {}
  }
}

console.log('');
console.log(`  ✅ Build complete: ${productName}`);
console.log(`  📦 Output: dist-electron/`);
console.log('');

})().catch(err => {
  console.error('  ❌ Unexpected error:', err);
  exit(1);
});
