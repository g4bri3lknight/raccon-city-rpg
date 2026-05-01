#!/usr/bin/env node

/**
 * Build Script — RPG Editor Portable Export (Neutralinojs)
 *
 * Usage:
 *   npm run export:game GAME_ID       → single game (build + package)
 *   npm run export:editor             → full editor + all games
 *   node scripts/build-portable.js --game=ID --no-build  → package only (skip next build)
 *
 * Architecture:
 *   The build produces a ZIP file containing:
 *     AppName/
 *       AppName.exe          → Neutralinojs binary (~2.6MB, downloaded from GitHub)
 *       resources.neu        → UI resources bundle (index.html, icons, neutralino.js)
 *       standalone/          → Next.js standalone server (pruned)
 *       node/node.exe        → Windows Node.js runtime (~67MB)
 *       game-config.json     → game mode configuration
 *       (DBs are inside standalone/db/)
 *
 * Steps:
 *   1. Pre-flight checks (@neutralinojs/neu, adm-zip, DBs, Prisma)
 *   2. Run `next build` (standalone output) — SKIPPED with --no-build
 *   3. Copy static assets into standalone
 *   3b. PRUNE standalone — remove unnecessary files (locales, dev deps, wrong-platform binaries)
 *   4. Copy game DB(s) into standalone
 *   5. Download Neutralino binary from GitHub + create resources bundle
 *   6. Assemble package + create distributable ZIP
 */

const { execSync, cpSync, mkdirSync, existsSync, writeFileSync, readFileSync, unlinkSync, readdirSync, statSync, rmSync, createReadStream, createWriteStream } = require('fs');
const { join, dirname, resolve, basename } = require('path');
const { argv, env, exit, platform, arch } = require('process');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { createInflateRaw } = require('zlib');
const https = require('https');
const http = require('http');

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
const targetPlatform = findArg(args, 'platform') || 'win'; // win | mac | linux

if (!isGameOnly && !isEditor) {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   RPG Editor — Portable Build (Neutralino)   ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log('  ║                                              ║');
  console.log('  ║  Usage:                                      ║');
  console.log('  ║    npm run export:game <GAME_ID>              ║');
  console.log('  ║    npm run export:editor                     ║');
  console.log('  ║                                              ║');
  console.log('  ║  Flags:                                      ║');
  console.log('  ║    --name="Display Name"  custom EXE name     ║');
  console.log('  ║    --no-build           skip next build       ║');
  console.log('  ║    --platform=win|mac|linux  target platform   ║');
  console.log('  ║                                              ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  exit(1);
}

// productName: the display name shown in the EXE/window title
const productName = customName || (isGameOnly
  ? `RPG ${gameId}`
  : 'RPG Editor');

// Safe filename for the binary (no special chars)
const binaryName = productName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'RPG-Editor';

console.log('');
console.log(`  🎮 Building: ${binaryName}`);
console.log(`  📛 Product Name: ${productName}`);
console.log(`  📦 Mode: ${isGameOnly ? `Game-only (${gameId})` : 'Full Editor'}`);
const PLATFORM_LABELS = { win: 'Windows (WebView2)', mac: 'macOS (WebKit)', linux: 'Linux (WebKitGTK)' };
console.log(`  🖥️  Target: ${PLATFORM_LABELS[targetPlatform] || targetPlatform}`);
if (skipBuild) console.log(`  ⏭️  Skipping Next.js build (--no-build)`);
console.log('');

const ROOT = process.cwd();
const STANDALONE_DIR = join(ROOT, '.next', 'standalone');
const GAMES_DIR = join(ROOT, 'db', 'games');
const NEUTRALINO_DIR = join(ROOT, 'neutralino');
const NEUTRALINO_RES_DIR = join(NEUTRALINO_DIR, 'resources');
const NODE_CACHE_DIR = join(ROOT, '.node-runtime-cache');
const NODE_VERSION = 'v20.18.1';

// ═══════════════════════════════════════════════════════════
//  HELPER: Run command with real-time output + error capture
// ═══════════════════════════════════════════════════════════

function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const { cwd = ROOT, extraEnv = {}, shellCmd } = options;

    const childEnv = {
      ...env,
      ...extraEnv,
    };

    let cmdString;
    if (shellCmd) {
      cmdString = shellCmd;
    } else {
      cmdString = 'npx ' + [command, ...commandArgs].map(a => {
        if (a.includes(' ')) return `"${a}"`;
        return a;
      }).join(' ');
    }

    const child = spawn(cmdString, [], {
      cwd,
      env: childEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    const outputLines = [];
    const MAX_LINES = 200;

    child.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      const newLines = text.split('\n');
      for (const line of newLines) {
        if (line.trim()) outputLines.push(line);
      }
      while (outputLines.length > MAX_LINES) outputLines.shift();
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      const newLines = text.split('\n');
      for (const line of newLines) {
        if (line.trim()) outputLines.push(line);
      }
      while (outputLines.length > MAX_LINES) outputLines.shift();
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
//  HELPER: Download file with progress
// ═══════════════════════════════════════════════════════════

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = (currentUrl, redirects = 0) => {
      protocol.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirects < 5) {
          request(response.headers.location, redirects + 1);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastPercent = -1;

        const fileStream = createWriteStream(destPath);
        response.pipe(fileStream);

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = Math.round(downloadedBytes / totalBytes * 100);
            if (percent !== lastPercent && percent % 10 === 0) {
              process.stdout.write(`    ${percent}%...`);
              lastPercent = percent;
            }
          }
        });

        fileStream.on('finish', () => {
          fileStream.close();
          if (lastPercent >= 0) process.stdout.write(' 100%\n');
          resolve();
        });
      }).on('error', reject);
    };

    request(url);
  });
}

// ═══════════════════════════════════════════════════════════
//  HELPER: Ensure Node.js Windows runtime is available
// ═══════════════════════════════════════════════════════════

async function ensureNodeRuntime(targetPlatform) {
  mkdirSync(NODE_CACHE_DIR, { recursive: true });

  const PLATFORM_CONFIG = {
    win: {
      label: 'Windows x64',
      zipUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip`,
      zipPrefix: `node-${NODE_VERSION}-win-x64/`,
      binaryName: 'node.exe',
      cachedBinary: join(NODE_CACHE_DIR, 'node.exe'),
    },
    mac: {
      label: 'macOS x64',
      zipUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-x64.tar.gz`,
      // macOS uses tar.gz, extract via child process
      tarPrefix: `node-${NODE_VERSION}-darwin-x64/bin/node`,
      binaryName: 'node',
      cachedBinary: join(NODE_CACHE_DIR, 'node-macos'),
    },
    linux: {
      label: 'Linux x64',
      zipUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz`,
      tarPrefix: `node-${NODE_VERSION}-linux-x64/bin/node`,
      binaryName: 'node',
      cachedBinary: join(NODE_CACHE_DIR, 'node-linux'),
    },
  };

  const cfg = PLATFORM_CONFIG[targetPlatform] || PLATFORM_CONFIG.win;

  // Check cache
  if (existsSync(cfg.cachedBinary)) {
    const size = statSync(cfg.cachedBinary).size;
    console.log(`  ✅ Node.js runtime cached (${cfg.label}, ${(size / 1024 / 1024).toFixed(1)} MB)`);
    return cfg;
  }

  console.log(`  ⬇️  Node.js ${cfg.label} runtime not cached, downloading...`);

  if (targetPlatform === 'win') {
    // Windows: download zip, extract node.exe via adm-zip
    const cacheZip = join(NODE_CACHE_DIR, `node-${NODE_VERSION}-win-x64.zip`);
    if (!existsSync(cacheZip)) {
      console.log(`  ⬇️  Downloading Node.js ${NODE_VERSION} (${cfg.label})...`);
      await downloadFile(cfg.zipUrl, cacheZip);
    } else {
      console.log(`  📦 Using cached download: ${basename(cacheZip)}`);
    }
    console.log('  📦 Extracting node.exe...');
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(cacheZip);
    const entry = zip.getEntry(cfg.zipPrefix + cfg.binaryName);
    if (!entry) {
      console.error(`  ❌ ${cfg.binaryName} not found in the downloaded zip!`);
      exit(1);
    }
    zip.extractEntryTo(entry, NODE_CACHE_DIR, false, true);
  } else {
    // macOS / Linux: download tar.gz, extract via tar
    const cacheTar = join(NODE_CACHE_DIR, `node-${NODE_VERSION}-${targetPlatform === 'mac' ? 'darwin-x64' : 'linux-x64'}.tar.gz`);
    if (!existsSync(cacheTar)) {
      console.log(`  ⬇️  Downloading Node.js ${NODE_VERSION} (${cfg.label})...`);
      await downloadFile(cfg.zipUrl, cacheTar);
    } else {
      console.log(`  📦 Using cached download: ${basename(cacheTar)}`);
    }
    console.log(`  📦 Extracting ${cfg.binaryName}...`);
    const { execSync } = require('child_process');
    // Extract just the node binary from the tar
    execSync(`tar -xzf "${cacheTar}" -C "${NODE_CACHE_DIR}" "${cfg.tarPrefix}"`, { stdio: 'pipe' });
    // The tar extracts to a path like NODE_CACHE_DIR/node-v20.18.1-darwin-x64/bin/node
    // Rename it to a simple name
    const extractedDir = join(NODE_CACHE_DIR, `node-${NODE_VERSION}-${targetPlatform === 'mac' ? 'darwin-x64' : 'linux-x64'}`, 'bin');
    if (existsSync(join(extractedDir, cfg.binaryName))) {
      cpSync(join(extractedDir, cfg.binaryName), cfg.cachedBinary);
      // Clean up extracted directory
      try { rmSync(join(NODE_CACHE_DIR, `node-${NODE_VERSION}-${targetPlatform === 'mac' ? 'darwin-x64' : 'linux-x64'}`), { recursive: true }); } catch {}
    }
  }

  if (!existsSync(cfg.cachedBinary)) {
    console.error(`  ❌ Failed to extract ${cfg.binaryName}!`);
    exit(1);
  }
  const size = statSync(cfg.cachedBinary).size;
  console.log(`  ✅ Node.js runtime ready (${cfg.label}, ${(size / 1024 / 1024).toFixed(1)} MB)`);
  return cfg;
}

// ═══════════════════════════════════════════════════════════
//  HELPER: Generate Neutralino config with dynamic product name
// ═══════════════════════════════════════════════════════════

function generateNeutralinoConfig() {
  const baseConfig = JSON.parse(readFileSync(join(NEUTRALINO_DIR, 'neutralino.config.json'), 'utf-8'));

  baseConfig.modes.window.title = productName;
  baseConfig.cli.binaryName = binaryName;

  const iconPath = join(NEUTRALINO_DIR, 'resources', 'icons', 'icon.png');
  if (existsSync(iconPath)) {
    baseConfig.modes.window.icon = '/resources/icons/icon.png';
  }

  return baseConfig;
}

// ═══════════════════════════════════════════════════════════
//  HELPER: Recursively copy directory
// ═══════════════════════════════════════════════════════════

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      cpSync(srcPath, destPath);
    } else {
      // Symlinks, junctions, etc. — copy with recursive to handle on Windows
      cpSync(srcPath, destPath, { recursive: true });
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  HELPER: Calculate directory size
// ═══════════════════════════════════════════════════════════

function calcDirSize(dir) {
  let total = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) total += calcDirSize(p);
      else total += statSync(p).size;
    }
  } catch { /* ignore */ }
  return total;
}

// ═══════════════════════════════════════════════════════════
//  HELPER: Safely remove a file/dir (no error if not exists)
// ═══════════════════════════════════════════════════════════

function safeRemove(path) {
  try {
    if (existsSync(path)) rmSync(path, { recursive: true, force: true });
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════
//  PRUNE STANDALONE — Remove unnecessary files from node_modules
//
//  This function aggressively removes files that are not needed
//  for the production runtime:
//    • Locale/language files except English and Italian
//    • TypeScript declaration files (.d.ts, .d.mts)
//    • Source maps (.js.map)
//    • Test files
//    • README, LICENSE, CHANGELOG, CHANGELOG files
//    • Wrong-platform native binaries (Linux/macOS for Windows export)
//    • Unused heavy packages that are not actually imported
//    • Dev-only metadata files
// ═══════════════════════════════════════════════════════════

function pruneStandalone(baseDir, targetPlatform) {
  const nmDir = join(baseDir, 'node_modules');
  if (!existsSync(nmDir)) return;

  let totalRemoved = 0;
  const LOCALES_TO_KEEP = new Set(['en', 'en-US', 'en-GB', 'it', 'it-IT', 'en-CA', 'en-AU']);

  function removeIfNotInSet(dir, keepSet, label) {
    if (!existsSync(dir)) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const nameWithoutExt = entry.name.replace(/\.(js|ts|mjs|cjs|json|d\.ts|d\.mts)$/, '');
        const baseName = nameWithoutExt.split('.')[0];
        if (!keepSet.has(baseName) && !keepSet.has(entry.name)) {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            const size = calcDirSize(fullPath);
            safeRemove(fullPath);
            totalRemoved += size;
          } else {
            try {
              totalRemoved += statSync(fullPath).size;
              safeRemove(fullPath);
            } catch { /* ignore */ }
          }
        }
      }
      console.log(`  ✂️  Pruned ${label} (${(totalRemoved / 1024).toFixed(0)} KB removed)`);
      totalRemoved = 0;
    } catch { /* ignore */ }
  }

  // ── 1. date-fns locales: keep only en/it ──
  // date-fns v4 has locale files like: en.ts, en.js, it.ts, it.js, etc.
  const dateFnsLocaleDir = join(nmDir, 'date-fns', 'locale');
  removeIfNotInSet(dateFnsLocaleDir, LOCALES_TO_KEEP, 'date-fns locales (kept en/it only)');

  // Also prune date-fns/fp locales if present
  const dateFnsFpLocaleDir = join(nmDir, 'date-fns', 'fp', 'locale');
  if (existsSync(dateFnsFpLocaleDir)) {
    removeIfNotInSet(dateFnsFpLocaleDir, LOCALES_TO_KEEP, 'date-fns/fp locales');
  }

  // ── 2. react-syntax-highlighter: remove all language definitions ──
  // This package includes 300+ Prism language files and 197 HLJS languages.
  // Since the app doesn't use syntax highlighting, remove them all.
  const rshPrismDir = join(nmDir, 'react-syntax-highlighter', 'dist', 'esm', 'languages', 'prism');
  if (existsSync(rshPrismDir)) {
    const sizeBefore = calcDirSize(rshPrismDir);
    safeRemove(rshPrismDir);
    console.log(`  ✂️  Removed react-syntax-highlighter Prism languages (${(sizeBefore / 1024).toFixed(0)} KB)`);
    totalRemoved += sizeBefore;
  }
  const rshPrismCjsDir = join(nmDir, 'react-syntax-highlighter', 'dist', 'cjs', 'languages', 'prism');
  if (existsSync(rshPrismCjsDir)) {
    const sizeBefore = calcDirSize(rshPrismCjsDir);
    safeRemove(rshPrismCjsDir);
    console.log(`  ✂️  Removed react-syntax-highlighter Prism CJS languages (${(sizeBefore / 1024).toFixed(0)} KB)`);
  }
  const rshHljsDir = join(nmDir, 'react-syntax-highlighter', 'dist', 'esm', 'languages', 'hljs');
  if (existsSync(rshHljsDir)) {
    const sizeBefore = calcDirSize(rshHljsDir);
    safeRemove(rshHljsDir);
    console.log(`  ✂️  Removed react-syntax-highlighter HLJS languages (${(sizeBefore / 1024).toFixed(0)} KB)`);
  }
  const rshHljsCjsDir = join(nmDir, 'react-syntax-highlighter', 'dist', 'cjs', 'languages', 'hljs');
  if (existsSync(rshHljsCjsDir)) {
    const sizeBefore = calcDirSize(rshHljsCjsDir);
    safeRemove(rshHljsCjsDir);
    console.log(`  ✂️  Removed react-syntax-highlighter HLJS CJS languages (${(sizeBefore / 1024).toFixed(0)} KB)`);
  }

  // ── 3. Remove next-intl entirely (not used in the app) ──
  const nextIntlDir = join(nmDir, 'next-intl');
  if (existsSync(nextIntlDir)) {
    const sizeBefore = calcDirSize(nextIntlDir);
    safeRemove(nextIntlDir);
    console.log(`  ✂️  Removed next-intl (unused, ${(sizeBefore / 1024).toFixed(0)} KB)`);
  }

  // ── 4. Remove wrong-platform native binaries ──
  const allPlatformDirs = {
    // sharp / @img platform binaries
    linux: [
      join(nmDir, '@img', 'sharp-libvips-linux-x64'),
      join(nmDir, '@img', 'sharp-libvips-linuxmusl-x64'),
      join(nmDir, '@img', 'sharp-linux-x64'),
      join(nmDir, '@img', 'sharp-linuxmusl-x64'),
      join(nmDir, 'sharp', 'linux-x64'),
      join(nmDir, 'sharp', 'linuxmusl-x64'),
      join(nmDir, 'sharp', 'libvips-linux-x64'),
      join(nmDir, 'sharp', 'libvips-linuxmusl-x64'),
    ],
    darwin: [
      join(nmDir, '@img', 'sharp-darwin-x64'),
      join(nmDir, '@img', 'sharp-darwin-arm64'),
      join(nmDir, 'sharp', 'darwin-x64'),
      join(nmDir, 'sharp', 'darwin-arm64'),
      join(nmDir, 'sharp', 'libvips-darwin-x64'),
      join(nmDir, 'sharp', 'libvips-darwin-arm64'),
    ],
    win: [
      join(nmDir, '@img', 'sharp-win32-x64'),
      join(nmDir, '@img', 'sharp-win32-ia32'),
      join(nmDir, 'sharp', 'win32-x64'),
      join(nmDir, 'sharp', 'win32-ia32'),
      join(nmDir, 'sharp', 'libvips-win32-x64'),
      join(nmDir, 'sharp', 'libvips-win32-ia32'),
    ],
  };

  // Prisma engine files per platform
  const prismaEngineFiles = {
    linux: [join(nmDir, '@prisma', 'engines', 'libquery_engine-debian-openssl-3.0.x.so.node')],
    darwin: [join(nmDir, '@prisma', 'engines', 'libquery_engine-debian-openssl-3.0.x.dylib.node')],
    win: [join(nmDir, '@prisma', 'engines', 'libquery_engine-debian-openssl-3.0.x.dll.node')],
  };

  // Determine which platforms to REMOVE (everything except target)
  const platformMap = { win: 'win', mac: 'darwin', linux: 'linux' };
  const targetKey = platformMap[targetPlatform] || 'win';
  const platformsToRemove = Object.keys(allPlatformDirs).filter(k => k !== targetKey);

  for (const pKey of platformsToRemove) {
    for (const p of (allPlatformDirs[pKey] || [])) {
      if (existsSync(p)) {
        try {
          const st = statSync(p);
          const size = st.isDirectory() ? calcDirSize(p) : st.size;
          safeRemove(p);
          if (size > 1024 * 1024) {
            console.log(`  ✂️  Removed ${basename(p)} (${(size / 1024 / 1024).toFixed(1)} MB)`);
          } else if (size > 1024) {
            console.log(`  ✂️  Removed ${basename(p)} (${(size / 1024).toFixed(0)} KB)`);
          }
        } catch { /* ignore */ }
      }
      for (const ext of ['-wal', '-shm']) safeRemove(p + ext);
    }
  }

  // Remove wrong-platform Prisma engines
  for (const pKey of platformsToRemove) {
    for (const p of (prismaEngineFiles[pKey] || [])) {
      if (existsSync(p)) {
        const st = statSync(p);
        const size = st.size;
        safeRemove(p);
        console.log(`  ✂️  Removed ${basename(p)} (${(size / 1024 / 1024).toFixed(1)} MB)`);
      }
    }
  }

  // ── 5. Remove Prisma schema-engine (not needed at runtime) ──
  const schemaEngineDir = join(nmDir, '@prisma', 'engines', 'schema-engine-debian-openssl-3.0.x');
  if (existsSync(schemaEngineDir)) {
    const sizeBefore = calcDirSize(schemaEngineDir);
    safeRemove(schemaEngineDir);
    console.log(`  ✂️  Removed Prisma schema-engine (${(sizeBefore / 1024 / 1024).toFixed(1)} MB)`);
  }
  const schemaEngineDir2 = join(nmDir, '@prisma', 'engines', 'schema-engine');
  if (existsSync(schemaEngineDir2)) {
    const sizeBefore = calcDirSize(schemaEngineDir2);
    safeRemove(schemaEngineDir2);
    console.log(`  ✂️  Removed Prisma schema-engine (${(sizeBefore / 1024 / 1024).toFixed(1)} MB)`);
  }

  // ── 6. Remove TypeScript declaration files (.d.ts, .d.mts) ──
  // These are only needed at compile time, not runtime.
  // We do a targeted scan of the heaviest packages.
  const dtsPackages = [
    '@radix-ui', 'framer-motion', 'recharts', '@tanstack',
    '@dnd-kit', 'cmdk', 'vaul', 'embla-carousel-react',
    'react-hook-form', '@hookform', 'class-variance-authority',
    'clsx', 'tailwind-merge', 'sonner', 'lucide-react',
    'react-markdown', 'input-otp', 'react-day-picker',
    'react-resizable-panels', 'date-fns', 'zustand', 'zod',
  ];

  let dtsCount = 0;
  let dtsSize = 0;
  for (const pkg of dtsPackages) {
    const pkgDir = join(nmDir, pkg);
    if (!existsSync(pkgDir)) continue;
    try {
      removeDtsRecursive(pkgDir);
    } catch { /* ignore */ }
  }

  function removeDtsRecursive(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          removeDtsRecursive(fullPath);
        } else if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.d.mts') || entry.name.endsWith('.d.cts')) {
          try {
            dtsSize += statSync(fullPath).size;
            safeRemove(fullPath);
            dtsCount++;
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  if (dtsCount > 0) {
    console.log(`  ✂️  Removed ${dtsCount} TypeScript declaration files (${(dtsSize / 1024).toFixed(0)} KB)`);
  }

  // ── 7. Remove source maps (.js.map, .mjs.map, .cjs.map) ──
  let mapCount = 0;
  let mapSize = 0;

  function removeMapsRecursive(dir, depth) {
    if (depth > 8) return; // limit recursion
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          removeMapsRecursive(fullPath, depth + 1);
        } else if (entry.name.endsWith('.map')) {
          try {
            mapSize += statSync(fullPath).size;
            safeRemove(fullPath);
            mapCount++;
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  removeMapsRecursive(nmDir, 0);
  if (mapCount > 0) {
    console.log(`  ✂️  Removed ${mapCount} source map files (${(mapSize / 1024).toFixed(0)} KB)`);
  }

  // ── 8. Remove unnecessary metadata files from packages ──
  const metaFiles = ['README.md', 'README', 'README.txt', 'LICENSE', 'LICENSE.md', 'CHANGELOG.md', 'CHANGELOG', 'HISTORY.md', 'HISTORY', 'AUTHORS', 'CONTRIBUTORS', '.eslintrc*', '.prettierrc*', 'tsconfig.json', 'jest.config.*', '.editorconfig', '.npmignore', 'Makefile', 'bower.json'];

  let metaCount = 0;
  let metaSize = 0;

  function removeMetaRecursive(dir, depth) {
    if (depth > 4) return; // only scan top-level packages
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory() && depth < 2) {
          removeMetaRecursive(fullPath, depth + 1);
        } else if (entry.isFile()) {
          for (const meta of metaFiles) {
            if (entry.name === meta || (meta.endsWith('*') && entry.name.startsWith(meta.slice(0, -1)))) {
              try {
                metaSize += statSync(fullPath).size;
                safeRemove(fullPath);
                metaCount++;
              } catch { /* ignore */ }
              break;
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  removeMetaRecursive(nmDir, 0);
  if (metaCount > 0) {
    console.log(`  ✂️  Removed ${metaCount} metadata/doc files (${(metaSize / 1024).toFixed(0)} KB)`);
  }

  // ── 9. Remove test directories ──
  const testDirs = ['__tests__', '__mocks__', 'test', 'tests', 'coverage', '.nyc_output'];
  let testSize = 0;
  let testCount = 0;

  function removeTestDirsRecursive(dir, depth) {
    if (depth > 4) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && testDirs.includes(entry.name)) {
          const fullPath = join(dir, entry.name);
          const size = calcDirSize(fullPath);
          safeRemove(fullPath);
          testSize += size;
          testCount++;
        } else if (entry.isDirectory() && depth < 3) {
          removeTestDirsRecursive(join(dir, entry.name), depth + 1);
        }
      }
    } catch { /* ignore */ }
  }

  removeTestDirsRecursive(nmDir, 0);
  if (testCount > 0) {
    console.log(`  ✂️  Removed ${testCount} test directories (${(testSize / 1024 / 1024).toFixed(1)} MB)`);
  }

  // ── 10. Remove markdown-it locale data (if present) ──
  const mdItLocaleDir = join(nmDir, 'markdown-it', 'lib', 'rules_core');
  if (existsSync(mdItLocaleDir)) {
    // markdown-it locale files are tiny, not worth pruning
  }

  // ── 11. Remove electron-related packages if somehow traced ──
  const electronPkgs = ['electron', 'electron-builder'];
  for (const pkg of electronPkgs) {
    const pkgDir = join(nmDir, pkg);
    if (existsSync(pkgDir)) {
      const size = calcDirSize(pkgDir);
      safeRemove(pkgDir);
      console.log(`  ✂️  Removed ${pkg} (not needed, ${(size / 1024 / 1024).toFixed(1)} MB)`);
    }
  }

  // ── 12. Remove .prisma/client extra stuff ──
  const prismaClientDir = join(nmDir, '.prisma', 'client');
  if (existsSync(prismaClientDir)) {
    // The generated client is needed, but we can remove the generator scripts
    safeRemove(join(prismaClientDir, 'generator-build'));
    safeRemove(join(prismaClientDir, 'src'));
    safeRemove(join(prismaClientDir, 'scripts'));
  }

  console.log('');
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════

(async () => {

// ═══════════════════════════════════════════════════════════
//  STEP 0: PRE-CLEANUP — Remove stale artifacts from previous builds
//  This ensures no .exe or stray files remain from interrupted builds
// ═══════════════════════════════════════════════════════════
const staleDist = join(ROOT, 'neutralino', 'dist');
if (existsSync(staleDist)) {
  console.log('  🧹 Cleaning stale build artifacts from previous run...');
  try {
    rmSync(staleDist, { recursive: true, force: true });
    console.log('  ✅ Cleaned neutralino/dist/');
  } catch (e) {
    console.warn('  ⚠️  Could not clean neutralino/dist/ (may be in use)');
  }
}

// ═══════════════════════════════════════════════════════════
//  STEP 1: PRE-FLIGHT CHECKS
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 1/6: Pre-flight checks...');

// 1a. @neutralinojs/neu
try {
  const neuPkg = require('@neutralinojs/neu/package.json');
  console.log(`  ✅ @neutralinojs/neu v${neuPkg.version}`);
} catch {
  console.error('  ❌ @neutralinojs/neu is not installed!');
  console.error('  Install it with: npm install -D @neutralinojs/neu');
  exit(1);
}

// 1b. adm-zip
try {
  require('adm-zip');
  console.log('  ✅ adm-zip found');
} catch {
  console.log('  ⬇️  Installing adm-zip...');
  try {
    execSync('npm install -D adm-zip', { cwd: ROOT, stdio: 'inherit' });
    console.log('  ✅ adm-zip installed');
  } catch {
    try {
      execSync('bun add -D adm-zip', { cwd: ROOT, stdio: 'inherit' });
      console.log('  ✅ adm-zip installed');
    } catch {
      console.error('  ❌ Failed to install adm-zip!');
      exit(1);
    }
  }
}

// 1c. neutralino.config.json
if (!existsSync(join(NEUTRALINO_DIR, 'neutralino.config.json'))) {
  console.error('  ❌ neutralino/neutralino.config.json not found!');
  exit(1);
}
console.log('  ✅ neutralino.config.json found');

// 1d. Game DB
if (isGameOnly) {
  const gameDb = join(GAMES_DIR, `${gameId}.db`);
  if (!existsSync(gameDb)) {
    console.error(`  ❌ Game DB not found: ${gameDb}`);
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

// 1e. Prisma engine
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

console.log('  ✅ All pre-flight checks passed');

// ═══════════════════════════════════════════════════════════
//  STEP 2: NEXT.JS BUILD (skipped with --no-build)
// ═══════════════════════════════════════════════════════════

if (skipBuild) {
  console.log('  ── Step 2/6: Skipping Next.js build (--no-build)...');

  if (!existsSync(join(STANDALONE_DIR, 'server.js'))) {
    console.error('');
    console.error('  ❌ .next/standalone/server.js not found!');
    console.error('  The --no-build flag requires a pre-existing build.');
    console.error('  Run this command first from the terminal:');
    console.error('    npm run build');
    console.error('');
    exit(1);
  }
  console.log('  ✅ Using existing standalone build');
} else {
  console.log('  ── Step 2/6: Building Next.js (standalone)...');
  console.log('');

  const MAX_BUILD_RETRIES = 3;
  let buildOk = false;
  for (let attempt = 1; attempt <= MAX_BUILD_RETRIES; attempt++) {
    try {
      if (attempt > 1) console.log(`  🔄 Retry ${attempt}/${MAX_BUILD_RETRIES}...`);
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

  if (!existsSync(join(STANDALONE_DIR, 'server.js'))) {
    console.error('  ❌ Standalone build not found at .next/standalone/server.js');
    console.error('  Make sure next.config.ts has: output: "standalone"');
    exit(1);
  }
  console.log('');
  console.log('  ✅ Next.js standalone build complete');
}

// ═══════════════════════════════════════════════════════════
//  STEP 3: COPY STATIC ASSETS INTO STANDALONE
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 3/6: Copying static assets into standalone...');

// .next/static
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

// public/
const publicFrom = join(ROOT, 'public');
const publicTo = join(STANDALONE_DIR, 'public');
if (existsSync(publicFrom)) {
  if (existsSync(publicTo)) rmSync(publicTo, { recursive: true });
  cpSync(publicFrom, publicTo, { recursive: true });
  console.log('  ✅ Copied public/');
}

// Prisma engine (.prisma directory — the query engine binary)
const prismaNodeModules = join(ROOT, 'node_modules', '.prisma');
const standalonePrisma = join(STANDALONE_DIR, 'node_modules', '.prisma');
if (existsSync(prismaNodeModules)) {
  if (existsSync(standalonePrisma)) rmSync(standalonePrisma, { recursive: true });
  mkdirSync(dirname(standalonePrisma), { recursive: true });
  cpSync(prismaNodeModules, standalonePrisma, { recursive: true });
  console.log('  ✅ Copied Prisma engine');
}

// @prisma/client — only copy if not already in standalone (Next.js traces it)
const prismaClientFrom = join(ROOT, 'node_modules', '@prisma', 'client');
const prismaClientTo = join(STANDALONE_DIR, 'node_modules', '@prisma', 'client');
if (existsSync(prismaClientFrom) && !existsSync(prismaClientTo)) {
  mkdirSync(dirname(prismaClientTo), { recursive: true });
  cpSync(prismaClientFrom, prismaClientTo, { recursive: true });
  console.log('  ✅ Copied @prisma/client');
} else if (existsSync(prismaClientTo)) {
  console.log('  ✅ @prisma/client already in standalone');
}

// prisma/schema.prisma (needed for Prisma to find the schema)
const schemaFrom = join(ROOT, 'prisma', 'schema.prisma');
const schemaTo = join(STANDALONE_DIR, 'prisma', 'schema.prisma');
if (existsSync(schemaFrom)) {
  if (existsSync(dirname(schemaTo))) rmSync(dirname(schemaTo), { recursive: true });
  mkdirSync(dirname(schemaTo), { recursive: true });
  cpSync(schemaFrom, schemaTo);
  console.log('  ✅ Copied prisma/schema.prisma');
}

// ═══════════════════════════════════════════════════════════
//  STEP 3b: PRUNE STANDALONE — Remove unnecessary files
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 3b: Pruning standalone (removing unnecessary files)...');
const sizeBefore = calcDirSize(STANDALONE_DIR);
console.log(`  📏 Standalone size before pruning: ${(sizeBefore / 1024 / 1024).toFixed(1)} MB`);
console.log('');

// ── Fix nested seed-data directories (safety check) ──
const standaloneSeedData = join(STANDALONE_DIR, 'src', 'seed-data');
if (existsSync(standaloneSeedData)) {
  const nestedSeedData = join(standaloneSeedData, 'seed-data');
  if (existsSync(nestedSeedData)) {
    console.log('  ⚠️  Found nested seed-data/seed-data/ — removing inner duplicate...');
    rmSync(nestedSeedData, { recursive: true, force: true });
    console.log('  ✅ Removed nested seed-data/seed-data/');
  }
}

pruneStandalone(STANDALONE_DIR, targetPlatform);

const sizeAfter = calcDirSize(STANDALONE_DIR);
const saved = sizeBefore - sizeAfter;
console.log(`  📏 Standalone size after pruning: ${(sizeAfter / 1024 / 1024).toFixed(1)} MB`);
console.log(`  💾 Saved: ${(saved / 1024 / 1024).toFixed(1)} MB (${((saved / sizeBefore) * 100).toFixed(0)}% reduction)`);
console.log('');

// ═══════════════════════════════════════════════════════════
//  STEP 4: COPY GAME DATABASE(S) INTO STANDALONE
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 4/6: Copying game database(s)...');

const standaloneDbGames = join(STANDALONE_DIR, 'db', 'games');
const standaloneDbBase = join(STANDALONE_DIR, 'db');
mkdirSync(standaloneDbGames, { recursive: true });

if (isGameOnly) {
  const gameDb = join(GAMES_DIR, `${gameId}.db`);
  cpSync(gameDb, join(standaloneDbGames, `${gameId}.db`));
  console.log(`  ✅ Copied: ${gameId}.db (${(statSync(gameDb).size / 1024 / 1024).toFixed(1)} MB)`);

  const editorDb = join(ROOT, 'db', 'custom.db');
  if (existsSync(editorDb)) {
    cpSync(editorDb, join(standaloneDbBase, 'custom.db'));
    console.log('  ✅ Copied: custom.db (editor DB)');
  }

  writeFileSync(join(standaloneDbBase, '.active-game'), gameId, 'utf-8');
  console.log(`  ✅ Active game set: ${gameId}`);
} else {
  const dbs = readdirSync(GAMES_DIR).filter(f => f.endsWith('.db'));
  for (const db of dbs) {
    const src = join(GAMES_DIR, db);
    cpSync(src, join(standaloneDbGames, db));
    console.log(`  ✅ Copied: ${db} (${(statSync(src).size / 1024 / 1024).toFixed(1)} MB)`);
  }

  const activeFile = join(ROOT, 'db', '.active-game');
  if (existsSync(activeFile)) {
    cpSync(activeFile, join(standaloneDbBase, '.active-game'));
    console.log('  ✅ Copied .active-game');
  }

  const editorDb = join(ROOT, 'db', 'custom.db');
  if (existsSync(editorDb)) {
    cpSync(editorDb, join(standaloneDbBase, 'custom.db'));
    console.log('  ✅ Copied: custom.db (editor DB)');
  }
}

// ═══════════════════════════════════════════════════════════
//  STEP 5: PREPARE NEUTRALINO RESOURCES + BUILD
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 5/6: Preparing Neutralino resources + build...');

// 5a. Clean previous build COMPLETELY
const prevDist = join(NEUTRALINO_DIR, 'dist');
if (existsSync(prevDist)) rmSync(prevDist, { recursive: true });
mkdirSync(prevDist, { recursive: true });

// 5b. Write game-config.json INTO resources/
const gameConfig = isGameOnly
  ? { productName, gameName: customName || gameId, gameId, isGameOnly: true }
  : { productName, gameName: null, gameId: null, isGameOnly: false };
writeFileSync(join(NEUTRALINO_RES_DIR, 'game-config.json'), JSON.stringify(gameConfig, null, 2), 'utf-8');
console.log('  ✅ Written game-config.json → resources/');

// 5c. Make sure ONLY lightweight files are in resources/
const heavyDirs = ['standalone', 'node'];
for (const d of heavyDirs) {
  const heavyPath = join(NEUTRALINO_RES_DIR, d);
  if (existsSync(heavyPath)) {
    rmSync(heavyPath, { recursive: true });
    console.log(`  🗑️  Removed ${d}/ from resources/ (will be placed alongside .exe)`);
  }
}

// 5d. Generate dynamic neutralino.config.json
const config = generateNeutralinoConfig();
writeFileSync(join(NEUTRALINO_DIR, 'neutralino.config.json'), JSON.stringify(config, null, 2), 'utf-8');
console.log(`  ✅ Generated neutralino.config.json (binaryName: "${binaryName}")`);

// 5e. Get Neutralino binary version from config
const NL_VERSION = config.cli.binaryVersion || '5.4.0';
console.log(`  📋 Neutralino version: ${NL_VERSION}`);

// 5f. Download Neutralino binary from GitHub releases
const NEUTRALINO_CACHE_DIR = join(ROOT, '.neutralino-binaries');
mkdirSync(NEUTRALINO_CACHE_DIR, { recursive: true });

const NL_PLATFORM_BINARY = {
  win: { suffix: 'win_x64', ext: '.exe', label: 'Windows x64' },
  mac: { suffix: 'mac_arm64', ext: '', label: 'macOS ARM64' },
  linux: { suffix: 'linux_x64', ext: '', label: 'Linux x64' },
};
const nlBin = NL_PLATFORM_BINARY[targetPlatform] || NL_PLATFORM_BINARY.win;
const cachedExe = join(NEUTRALINO_CACHE_DIR, `neutralino-${nlBin.suffix}-v${NL_VERSION}${nlBin.ext}`);
if (existsSync(cachedExe)) {
  console.log(`  ✅ Neutralino binary cached (${nlBin.label}, ${(statSync(cachedExe).size / 1024 / 1024).toFixed(1)} MB)`);
} else {
  console.log(`  ⬇️  Downloading Neutralino ${nlBin.label} binary from GitHub...`);
  const releaseUrl = `https://github.com/neutralinojs/neutralinojs/releases/download/v${NL_VERSION}/neutralinojs-v${NL_VERSION}.zip`;
  const cacheZip = join(NEUTRALINO_CACHE_DIR, `neutralinojs-v${NL_VERSION}.zip`);
  try {
    if (!existsSync(cacheZip)) await downloadFile(releaseUrl, cacheZip);
    const entryName = `neutralino-${nlBin.suffix}${nlBin.ext}`;
    console.log(`  📦 Extracting ${entryName}...`);
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(cacheZip);
    const entry = zip.getEntry(entryName);
    if (!entry) {
      console.error(`  ❌ ${entryName} not found in the zip!`);
      exit(1);
    }
    const rawPath = join(NEUTRALINO_CACHE_DIR, entryName);
    zip.extractEntryTo(entry, NEUTRALINO_CACHE_DIR, false, true);
    if (rawPath !== cachedExe) {
      if (existsSync(cachedExe)) unlinkSync(cachedExe);
      cpSync(rawPath, cachedExe);
      unlinkSync(rawPath);
    }
    if (!existsSync(cachedExe) || statSync(cachedExe).size < 1024 * 1024) {
      console.error(`  ❌ Failed to extract ${entryName}!`);
      exit(1);
    }
    console.log(`  ✅ Neutralino binary ready (${nlBin.label}, ${(statSync(cachedExe).size / 1024 / 1024).toFixed(1)} MB)`);
  } catch (err) {
    console.error(`  ❌ Failed to download Neutralino binary: ${err.message}`);
    exit(1);
  }
}

// 5g. Use neu build --release to create resources.neu
//     neu build creates resources.neu in the correct ASAR format that Neutralino can read.
console.log('  📦 Running neu build --release (for resources.neu)...');
console.log('');
try {
  await runCommand('neu', ['update'], { cwd: NEUTRALINO_DIR });
} catch (err) {
  console.warn('  ⚠️  neu update warning (non-fatal)');
}
try {
  await runCommand('neu', ['build', '--release'], { cwd: NEUTRALINO_DIR });
  console.log('  ✅ neu build complete');
} catch (err) {
  console.warn('  ⚠️  neu build failed (non-fatal):');
  console.warn('  ' + String(err.message || err).split('\n')[0]);
}

// 5h. Extract resources.neu from neu build output, then discard the rest
//     NEVER cache it — each build must produce a fresh resources.neu
let freshResourcesNeu = null;

// Try the expected directory first
const neuBuildOutput = join(prevDist, binaryName);
if (existsSync(neuBuildOutput)) {
  const neuRes = join(neuBuildOutput, 'resources.neu');
  if (existsSync(neuRes)) {
    const tmpRes = join(prevDist, '_tmp_resources.neu');
    cpSync(neuRes, tmpRes);
    freshResourcesNeu = tmpRes;
    console.log('  ✅ Extracted fresh resources.neu from neu build');
  }
  rmSync(neuBuildOutput, { recursive: true });
}

// neu build might have created a directory with a different name
try {
  const neuDirs = readdirSync(prevDist, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const d of neuDirs) {
    if (d.name.startsWith('_')) continue; // skip our temp file
    const candidate = join(prevDist, d.name, 'resources.neu');
    if (existsSync(candidate)) {
      const tmpRes = join(prevDist, '_tmp_resources.neu');
      cpSync(candidate, tmpRes);
      freshResourcesNeu = tmpRes;
      console.log('  ✅ Extracted resources.neu from ' + d.name + '/');
    }
    rmSync(join(prevDist, d.name), { recursive: true });
    console.log(`  🗑️  Removed ${d.name}/ (neu build artifact)`);
  }
} catch (e) { /* ignore */ }

// Clean up any leftover release zips from neu build
try {
  const neuReleaseZips = readdirSync(prevDist).filter(f => f.endsWith('-release.zip'));
  for (const rz of neuReleaseZips) {
    rmSync(join(prevDist, rz));
    console.log(`  🗑️  Removed ${rz} (neu build artifact)`);
  }
} catch { /* ignore */ }

// Also delete any old cached resources.neu to prevent stale data
try {
  const oldCache = join(NEUTRALINO_CACHE_DIR, 'resources.neu');
  if (existsSync(oldCache)) {
    rmSync(oldCache);
    console.log('  🗑️  Removed stale cached resources.neu');
  }
} catch (e) { /* ignore */ }

// 5i. Ensure Node.js runtime is available
const nodeRuntimeCfg = await ensureNodeRuntime(targetPlatform);

console.log('  ✅ Neutralino resources prepared');

// ═══════════════════════════════════════════════════════════
//  STEP 6: ASSEMBLE PACKAGE — ONE CLEAN ZIP
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 6/6: Assembling distributable package...');

const distDir = join(prevDist, binaryName);
mkdirSync(distDir, { recursive: true });

// 6a. Copy Neutralino binary → AppName[.exe] (platform-specific name)
const BINARY_EXT = targetPlatform === 'win' ? '.exe' : '';
const binaryFileName = `${binaryName}${BINARY_EXT}`;
const binDest = join(distDir, binaryFileName);
cpSync(cachedExe, binDest);
console.log(`  ✅ ${binaryFileName} (${(statSync(binDest).size / 1024 / 1024).toFixed(1)} MB)`);

// 6b. Copy resources.neu (fresh from THIS build, or create from resources/ dir)
if (freshResourcesNeu && existsSync(freshResourcesNeu)) {
  cpSync(freshResourcesNeu, join(distDir, 'resources.neu'));
  console.log('  ✅ resources.neu (fresh from neu build)');
  // Clean up temp file
  try { unlinkSync(freshResourcesNeu); } catch {}
} else {
  console.log('  ⚠️  neu build did not produce resources.neu — creating from resources/ directory...');
  // Create resources.neu manually by zipping the resources/ directory
  const AdmZip = require('adm-zip');
  const resZip = new AdmZip();
  const addResToZip = (dir, prefix, zipInstance) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        addResToZip(fullPath, prefix + entry.name + '/', zipInstance);
      } else {
        zipInstance.addLocalFile(fullPath, prefix);
      }
    }
  };
  addResToZip(NEUTRALINO_RES_DIR, '', resZip);
  const resNeuPath = join(distDir, 'resources.neu');
  resZip.writeZip(resNeuPath);
  // Verify game-config.json is inside
  const writtenZip = new AdmZip(resNeuPath);
  const configEntry = writtenZip.getEntry('game-config.json');
  if (configEntry) {
    const configContent = writtenZip.readAsText(configEntry);
    console.log('  ✅ Verified game-config.json in resources.neu: ' + configContent.substring(0, 80) + '...');
  } else {
    console.warn('  ⚠️  WARNING: game-config.json NOT found in resources.neu!');
  }
  console.log('  ✅ resources.neu (created from resources/ directory)');
}

// NOTE: main.js is copied to dist as a background script, but it is NOT
// compiled into the pre-built Neutralino binary downloaded from GitHub.
// Therefore, the windowClose handler in main.js does NOT run in portable builds.
// Instead, we use a heartbeat-based watchdog (server-watchdog.js):
//   - index.html writes a timestamp to heartbeat.tmp every 2 seconds
//   - server-watchdog.js monitors heartbeat.tmp and kills the server when stale

// 6c. Copy main.js (background script — kept for dev mode compatibility)
const mainJsSrc = join(NEUTRALINO_DIR, 'main.js');
if (existsSync(mainJsSrc)) {
  cpSync(mainJsSrc, join(distDir, 'main.js'));
  console.log('  ✅ main.js (background script)');
}

// 6c2. Copy server-watchdog.js (heartbeat-based server lifecycle manager)
// This is the PRIMARY mechanism for killing the Node server when the exe closes.
const watchdogSrc = join(NEUTRALINO_DIR, 'server-watchdog.js');
if (existsSync(watchdogSrc)) {
  cpSync(watchdogSrc, join(distDir, 'server-watchdog.js'));
  console.log('  ✅ server-watchdog.js (heartbeat monitor for server cleanup)');
} else {
  console.error('  ❌ server-watchdog.js not found — server will NOT be cleaned up on exit!');
}

// 6d. Copy game-config.json
writeFileSync(join(distDir, 'game-config.json'), JSON.stringify(gameConfig, null, 2), 'utf-8');

// 6d. Write start-server.bat / start-server.sh
// IMPORTANT: These now launch server-watchdog.js instead of server.js directly.
// The watchdog starts server.js as a child process and monitors heartbeat.tmp.
// When the Neutralino exe is closed, heartbeat stops, and the watchdog kills the server.
if (targetPlatform === 'win') {
  const batContent = '@echo off\r\ncd /d "%~dp0"\r\n"%~dp0node\\node.exe" server-watchdog.js\r\n';
  writeFileSync(join(distDir, 'start-server.bat'), batContent, 'utf-8');
  console.log('  ✅ start-server.bat (launches watchdog → server)');
} else {
  const shContent = '#!/bin/bash\nCD="$(cd "$(dirname "$0")" && pwd)"\n"$CD/node/' + nodeRuntimeCfg.binaryName + '" "$CD/server-watchdog.js"\n';
  writeFileSync(join(distDir, 'start-server.sh'), shContent, 'utf-8');
  try { execSync(`chmod +x "${join(distDir, 'start-server.sh')}"`); } catch {}
  console.log('  ✅ start-server.sh (launches watchdog → server)');
}

// 6e. Copy Node.js runtime
const distNodeDir = join(distDir, 'node');
mkdirSync(distNodeDir, { recursive: true });
cpSync(nodeRuntimeCfg.cachedBinary, join(distNodeDir, nodeRuntimeCfg.binaryName));
console.log(`  ✅ ${nodeRuntimeCfg.binaryName} (${(statSync(join(distNodeDir, nodeRuntimeCfg.binaryName)).size / 1024 / 1024).toFixed(1)} MB)`);

// 6f. Copy standalone server (already pruned!)
const distStandaloneDir = join(distDir, 'standalone');
copyDir(STANDALONE_DIR, distStandaloneDir);
const standaloneSize = calcDirSize(distStandaloneDir);
console.log(`  ✅ standalone/ (${(standaloneSize / 1024 / 1024).toFixed(1)} MB)`);

// Write game-config.json inside standalone/ too
writeFileSync(join(distStandaloneDir, 'game-config.json'), JSON.stringify(gameConfig, null, 2), 'utf-8');

// 6g. Create single ZIP
console.log('');
console.log('  📦 Creating ZIP...');

const AdmZip = require('adm-zip');
const addDirToZip = (dir, prefix, zipInstance) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      addDirToZip(fullPath, prefix + entry.name + '/', zipInstance);
    } else {
      zipInstance.addLocalFile(fullPath, prefix);
    }
  }
};

const zipPath = join(prevDist, `${binaryName}.zip`);
const zip = new AdmZip();
addDirToZip(distDir, `${binaryName}/`, zip);
zip.writeZip(zipPath);

const zipSize = statSync(zipPath).size;

console.log('');
console.log('  ══════════════════════════════════════════════');
console.log(`  ✅ Build complete: ${productName}`);
console.log(`  📦 ${binaryName}.zip (${(zipSize / 1024 / 1024).toFixed(1)} MB)`);
console.log(`  📂 Path: ${zipPath}`);
console.log(`  📂 Unpacked: ${distDir}`);
console.log('');
const PLATFORM_RUN = {
  win: '  🚀 Extract ZIP and run the .exe',
  mac: '  🚀 Extract ZIP, chmod +x the binary and run it',
  linux: '  🚀 Extract ZIP, chmod +x the binary and run it',
};
const PLATFORM_REQ = {
  win: '  ⚠️  Requires WebView2 (preinstalled on Windows 10/11)',
  mac: '  ⚠️  Uses native WebKit (no additional install required)',
  linux: '  ⚠️  Requires WebKitGTK (install via package manager)',
};
console.log(PLATFORM_RUN[targetPlatform] || PLATFORM_RUN.win);
console.log(PLATFORM_REQ[targetPlatform] || PLATFORM_REQ.win);
console.log('  ══════════════════════════════════════════════');
console.log('');

// FINAL CLEANUP — remove any stray files from neu build that weren't cleaned earlier
// (e.g. release zips at dist root level — but NOT our assembled BinaryName/ dir or .zip)
console.log('  🧹 Final cleanup...');
try {
  if (existsSync(prevDist)) {
    const finalEntries = readdirSync(prevDist, { withFileTypes: true });
    for (const entry of finalEntries) {
      if (entry.name === binaryName || entry.name === `${binaryName}.zip` || entry.name === '.gitkeep') continue;
      try { rmSync(join(prevDist, entry.name), { recursive: true, force: true }); } catch {}
    }
  }
} catch {}
console.log('  ✅ Cleanup complete');

})().catch(err => {
  console.error('  ❌ Unexpected error:', err);
  // EMERGENCY CLEANUP — always clean neu build artifacts on error
  try {
    const prevDist = join(ROOT, 'neutralino', 'dist');
    if (existsSync(prevDist)) {
      // Only remove neu-generated binaries, keep our assembled package
      const entries = readdirSync(prevDist, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          try { rmSync(join(prevDist, entry.name)); } catch {}
        }
      }
    }
  } catch {}
  exit(1);
});
