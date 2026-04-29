#!/usr/bin/env node

/**
 * Build Script — RPG Editor Portable Export (Neutralinojs)
 *
 * Usage:
 *   npm run export:game GAME_ID              → single game (build + package) [Windows]
 *   npm run export:game GAME_ID -- --platform=mac    → macOS build
 *   npm run export:game GAME_ID -- --platform=linux  → Linux build
 *   npm run export:editor                        → full editor + all games
 *   node scripts/build-portable.js --game=ID --no-build  → package only (skip next build)
 *
 * Flags:
 *   --platform=win|mac|linux   Target platform (default: win)
 *   --name="Display Name"      Custom EXE/product name
 *   --no-build                 Skip Next.js build
 *
 * Architecture:
 *   The build produces a ZIP file containing:
 *     AppName/
 *       AppName(.exe|.AppImage|no ext)  → Neutralinojs binary (~2.6MB)
 *       resources.neu                    → UI resources bundle
 *       standalone/                      → Next.js standalone server
 *       node/node                        → Node.js runtime (~67MB)
 *       game-config.json                 → Game mode configuration
 *       start-server.(bat|sh)            → Launch script
 *       (DBs are inside standalone/db/)
 *
 *   Total: ~80-100MB (vs ~228MB with Electron!)
 */

const { execSync, cpSync, mkdirSync, existsSync, writeFileSync, readFileSync, unlinkSync, readdirSync, statSync, rmSync, createWriteStream, chmodSync } = require('fs');
const { join, dirname, resolve, basename } = require('path');
const { argv, env, exit } = require('process');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
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
const targetPlatform = findArg(args, 'platform') || 'win';

// Validate platform
const VALID_PLATFORMS = ['win', 'mac', 'linux'];
if (!VALID_PLATFORMS.includes(targetPlatform)) {
  console.error(`  ❌ Invalid platform "${targetPlatform}". Must be one of: ${VALID_PLATFORMS.join(', ')}`);
  exit(1);
}

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
  console.log('  ║    --platform=win|mac|linux  target platform  ║');
  console.log('  ║    --name="Display Name"   custom name       ║');
  console.log('  ║    --no-build             skip next build    ║');
  console.log('  ║                                              ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  exit(1);
}

// productName: the display name shown in the window title
const productName = customName || (isGameOnly
  ? `RPG ${gameId}`
  : 'RPG Editor');

// Safe filename for the binary (no special chars)
const binaryName = productName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'RPG-Editor';

const platformLabels = { win: 'Windows', mac: 'macOS', linux: 'Linux' };

console.log('');
console.log(`  🎮 Building: ${binaryName}`);
console.log(`  📛 Product Name: ${productName}`);
console.log(`  📦 Mode: ${isGameOnly ? `Game-only (${gameId})` : 'Full Editor'}`);
console.log(`  💻 Platform: ${platformLabels[targetPlatform]} (${targetPlatform})`);
console.log(`  ⚙️  Engine: Neutralinojs (lightweight, WebView2)`);
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
//  PLATFORM CONFIGURATION
// ═══════════════════════════════════════════════════════════

const PLATFORM_CONFIG = {
  win: {
    neutralinoBinary: 'neutralino-win_x64.exe',
    binaryExt: '.exe',
    nodeFile: 'node.exe',
    nodeArchive: `node-${NODE_VERSION}-win-x64.zip`,
    nodeArchiveUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip`,
    nodeArchivePrefix: `node-${NODE_VERSION}-win-x64/`,
    launchScript: 'start-server.bat',
    launchScriptContent: (binaryDir) =>
      `@echo off\r\ncd /d "%~dp0standalone"\r\n"%~dp0node\\node.exe" server.js\r\n`,
  },
  mac: {
    neutralinoBinary: 'neutralino-mac_x64', // or neutralino-mac_arm64
    binaryExt: '', // macOS binaries have no extension
    nodeFile: 'node',
    nodeArchive: `node-${NODE_VERSION}-darwin-x64.tar.gz`,
    nodeArchiveUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-x64.tar.gz`,
    nodeArchivePrefix: `node-${NODE_VERSION}-darwin-x64/`,
    launchScript: 'start-server.sh',
    launchScriptContent: (binaryDir) =>
      `#!/bin/bash\nDIR="$(cd "$(dirname "$0")" && pwd)"\ncd "$DIR/standalone"\n"$DIR/node/node" server.js\n`,
  },
  linux: {
    neutralinoBinary: 'neutralino-linux_x64',
    binaryExt: '',
    nodeFile: 'node',
    nodeArchive: `node-${NODE_VERSION}-linux-x64.tar.xz`,
    nodeArchiveUrl: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz`,
    nodeArchivePrefix: `node-${NODE_VERSION}-linux-x64/`,
    launchScript: 'start-server.sh',
    launchScriptContent: (binaryDir) =>
      `#!/bin/bash\nDIR="$(cd "$(dirname "$0")" && pwd)"\ncd "$DIR/standalone"\n"$DIR/node/node" server.js\n`,
  },
};

const pConfig = PLATFORM_CONFIG[targetPlatform];

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
//  HELPER: Ensure Node.js runtime is available for the target platform
// ═══════════════════════════════════════════════════════════

async function ensureNodeRuntime() {
  const nodeExePath = join(NODE_CACHE_DIR, targetPlatform, pConfig.nodeFile);
  if (existsSync(nodeExePath)) {
    const size = statSync(nodeExePath).size;
    console.log(`  ✅ Node.js runtime cached for ${platformLabels[targetPlatform]} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    return;
  }

  console.log(`  ⬇️  Node.js ${platformLabels[targetPlatform]} runtime not cached, downloading...`);
  const platformCacheDir = join(NODE_CACHE_DIR, targetPlatform);
  mkdirSync(platformCacheDir, { recursive: true });

  const archivePath = join(platformCacheDir, pConfig.nodeArchive);

  if (!existsSync(archivePath)) {
    console.log(`  ⬇️  Downloading Node.js ${NODE_VERSION} (${platformLabels[targetPlatform]} x64)...`);
    await downloadFile(pConfig.nodeArchiveUrl, archivePath);
  } else {
    console.log(`  📦 Using cached download: ${pConfig.nodeArchive}`);
  }

  // Extract node binary from the archive
  console.log('  📦 Extracting Node.js binary...');

  if (targetPlatform === 'win') {
    // Windows: .zip archive
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(archivePath);
    const entry = zip.getEntry(pConfig.nodeArchivePrefix + 'node.exe');
    if (!entry) {
      console.error('  ❌ node.exe not found in the downloaded zip!');
      exit(1);
    }
    zip.extractEntryTo(entry, platformCacheDir, false, true);
  } else if (targetPlatform === 'mac') {
    // macOS: .tar.gz archive
    const { execSync } = require('child_process');
    execSync(`cd "${platformCacheDir}" && tar xzf "${archivePath}" --include="${pConfig.nodeArchivePrefix}bin/node" 2>/dev/null || tar xzf "${archivePath}" "${pConfig.nodeArchivePrefix}bin/node"`, { stdio: 'inherit' });
    // Copy node binary to the expected path
    const extractedBin = join(platformCacheDir, pConfig.nodeArchivePrefix, 'bin', 'node');
    if (existsSync(extractedBin)) {
      cpSync(extractedBin, nodeExePath);
    } else {
      // Try alternative path
      const altBin = join(platformCacheDir, 'bin', 'node');
      if (existsSync(altBin)) {
        cpSync(altBin, nodeExePath);
      } else {
        console.error('  ❌ node binary not found in the downloaded archive!');
        console.error(`  Expected: ${extractedBin}`);
        exit(1);
      }
    }
    // Cleanup extracted directory
    try { rmSync(join(platformCacheDir, pConfig.nodeArchivePrefix), { recursive: true }); } catch {}
  } else if (targetPlatform === 'linux') {
    // Linux: .tar.xz archive
    const { execSync } = require('child_process');
    execSync(`cd "${platformCacheDir}" && tar xJf "${archivePath}" --include="${pConfig.nodeArchivePrefix}bin/node" 2>/dev/null || tar xJf "${archivePath}" "${pConfig.nodeArchivePrefix}bin/node"`, { stdio: 'inherit' });
    const extractedBin = join(platformCacheDir, pConfig.nodeArchivePrefix, 'bin', 'node');
    if (existsSync(extractedBin)) {
      cpSync(extractedBin, nodeExePath);
    } else {
      const altBin = join(platformCacheDir, 'bin', 'node');
      if (existsSync(altBin)) {
        cpSync(altBin, nodeExePath);
      } else {
        console.error('  ❌ node binary not found in the downloaded archive!');
        console.error(`  Expected: ${extractedBin}`);
        exit(1);
      }
    }
    try { rmSync(join(platformCacheDir, pConfig.nodeArchivePrefix), { recursive: true }); } catch {}
  }

  if (existsSync(nodeExePath)) {
    const size = statSync(nodeExePath).size;
    console.log(`  ✅ Node.js runtime ready for ${platformLabels[targetPlatform]} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    console.error(`  ❌ Failed to extract ${pConfig.nodeFile}!`);
    exit(1);
  }
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
      cpSync(srcPath, destPath, { recursive: true });
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  HELPER: Safe recursive delete with retries (Windows EPERM fix)
// ═══════════════════════════════════════════════════════════

function safeRmSync(targetPath, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      rmSync(targetPath, { recursive: true, force: true });
      return;
    } catch (e) {
      if (attempt < retries && (e.code === 'EPERM' || e.code === 'EBUSY' || e.code === 'ENOTEMPTY')) {
        const delay = attempt * 500;
        console.log(`  ⚠️  rmSync failed (${e.code}), retry ${attempt}/${retries} in ${delay}ms...`);
        console.log(`  💡 If this persists, close any running ${binaryName}.exe or file explorers in that folder.`);
        // On Windows, try to kill Neutralino processes that might lock the dir
        if (process.platform === 'win32' && attempt === 2) {
          try { execSync('taskkill /F /IM neutralino-win_x64.exe /T >nul 2>&1', { stdio: 'ignore' }); } catch {}
        }
        // Busy wait (synchronous, no process spawn needed)
        const end = Date.now() + delay;
        while (Date.now() < end) { /* spin */ }
      } else {
        throw e;
      }
    }
  }
  // Final attempt, let it throw if it still fails
  rmSync(targetPath, { recursive: true, force: true });
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
//  MAIN
// ═══════════════════════════════════════════════════════════

(async () => {

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

// Prisma engine
const prismaNodeModules = join(ROOT, 'node_modules', '.prisma');
const standalonePrisma = join(STANDALONE_DIR, 'node_modules', '.prisma');
if (existsSync(prismaNodeModules)) {
  if (existsSync(standalonePrisma)) rmSync(standalonePrisma, { recursive: true });
  mkdirSync(dirname(standalonePrisma), { recursive: true });
  cpSync(prismaNodeModules, standalonePrisma, { recursive: true });
  console.log('  ✅ Copied Prisma engine');
}

// @prisma/client + @prisma/engines
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

// prisma/schema.prisma
const schemaFrom = join(ROOT, 'prisma', 'schema.prisma');
const schemaTo = join(STANDALONE_DIR, 'prisma', 'schema.prisma');
if (existsSync(schemaFrom)) {
  if (existsSync(dirname(schemaTo))) rmSync(dirname(schemaTo), { recursive: true });
  mkdirSync(dirname(schemaTo), { recursive: true });
  cpSync(schemaFrom, schemaTo);
  console.log('  ✅ Copied prisma/schema.prisma');
}

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
if (existsSync(prevDist)) {
  console.log('  🗑️  Cleaning previous build output...');
  safeRmSync(prevDist);
}
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
    console.log(`  🗑️  Removed ${d}/ from resources/ (will be placed alongside binary)`);
  }
}

// 5d. Generate dynamic neutralino.config.json
const config = generateNeutralinoConfig();
writeFileSync(join(NEUTRALINO_DIR, 'neutralino.config.json'), JSON.stringify(config, null, 2), 'utf-8');
console.log(`  ✅ Generated neutralino.config.json (binaryName: "${binaryName}")`);

// 5e. Get Neutralino binary version from config
const NL_VERSION = config.cli.binaryVersion || '5.4.0';
console.log(`  📋 Neutralino version: ${NL_VERSION}`);

// 5f. Download the correct Neutralino binary for the target platform
const NEUTRALINO_CACHE_DIR = join(ROOT, '.neutralino-binaries');
mkdirSync(NEUTRALINO_CACHE_DIR, { recursive: true });

// Map of binary names in the Neutralino release zip
const NEUTRALINO_BINARY_MAP = {
  win: 'neutralino-win_x64.exe',
  mac: 'neutralino-mac_x64',       // Intel macOS
  linux: 'neutralino-linux_x64',
};

const targetBinaryName = NEUTRALINO_BINARY_MAP[targetPlatform];
const cachedBinary = join(NEUTRALINO_CACHE_DIR, targetBinaryName);

if (existsSync(cachedBinary)) {
  console.log(`  ✅ Neutralino binary cached for ${platformLabels[targetPlatform]} (${(statSync(cachedBinary).size / 1024 / 1024).toFixed(1)} MB)`);
} else {
  console.log(`  ⬇️  Downloading Neutralino ${platformLabels[targetPlatform]} binary from GitHub...`);
  const releaseUrl = `https://github.com/neutralinojs/neutralinojs/releases/download/v${NL_VERSION}/neutralinojs-v${NL_VERSION}.zip`;
  const cacheZip = join(NEUTRALINO_CACHE_DIR, `neutralinojs-v${NL_VERSION}.zip`);
  try {
    if (!existsSync(cacheZip)) await downloadFile(releaseUrl, cacheZip);
    console.log(`  📦 Extracting ${targetBinaryName}...`);
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(cacheZip);
    const entry = zip.getEntry(targetBinaryName);
    if (!entry) {
      console.error(`  ❌ ${targetBinaryName} not found in the zip!`);
      console.error('  Available entries:');
      zip.getEntries().forEach(e => console.error(`    - ${e.entryName}`));
      exit(1);
    }
    zip.extractEntryTo(entry, NEUTRALINO_CACHE_DIR, false, true);
    if (!existsSync(cachedBinary) || statSync(cachedBinary).size < 1024 * 1024) {
      console.error(`  ❌ Failed to extract ${targetBinaryName}!`);
      exit(1);
    }
    console.log(`  ✅ Neutralino binary ready for ${platformLabels[targetPlatform]} (${(statSync(cachedBinary).size / 1024 / 1024).toFixed(1)} MB)`);
  } catch (err) {
    console.error(`  ❌ Failed to download Neutralino binary: ${err.message}`);
    exit(1);
  }
}

// 5g. Try neu build for resources.neu (non-fatal)
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

// 5h. Extract resources.neu from neu build output (if any)
//     NEVER cache it — each build must produce a fresh resources.neu
//     because game-config.json changes between editor and game-only builds.
var freshResourcesNeu = null;
const neuBuildOutput = join(prevDist, binaryName);

if (existsSync(neuBuildOutput)) {
  const neuRes = join(neuBuildOutput, 'resources.neu');
  if (existsSync(neuRes)) {
    // ⚠️ CRITICAL: Copy resources.neu to a TEMP location BEFORE deleting the neu build output!
    // Previously we saved the path then deleted the directory, which destroyed the file.
    const tmpRes = join(prevDist, '_tmp_resources.neu');
    cpSync(neuRes, tmpRes);
    freshResourcesNeu = tmpRes;
    console.log('  ✅ Extracted fresh resources.neu from neu build');
  }
  // Remove entire neu build output — we'll assemble clean
  safeRmSync(neuBuildOutput);
} else {
  // neu build might have created a directory with a different name
  // (e.g. the original binaryName from neutralino.config.json)
  try {
    const dirs = readdirSync(prevDist, { withFileTypes: true });
    for (const d of dirs) {
      if (d.isDirectory()) {
        const candidate = join(prevDist, d.name, 'resources.neu');
        if (existsSync(candidate)) {
          // Same: copy to temp before cleanup
          const tmpRes = join(prevDist, '_tmp_resources.neu');
          cpSync(candidate, tmpRes);
          freshResourcesNeu = tmpRes;
          console.log('  ✅ Extracted resources.neu from ' + d.name + '/');
          break;
        }
      }
    }
  } catch (e) { /* ignore */ }
}
// Clean up any leftover directories and release zips from neu build
try {
  const neuReleaseZips = readdirSync(prevDist).filter(f => f.endsWith('-release.zip'));
  for (const rz of neuReleaseZips) {
    try { unlinkSync(join(prevDist, rz)); } catch {}
    console.log(`  🗑️  Removed ${rz} (neu build artifact)`);
  }
  // Clean any leftover directories from neu build
  const neuDirs = readdirSync(prevDist, { withFileTypes: true }).filter(f => f.isDirectory());
  for (const d of neuDirs) {
    safeRmSync(join(prevDist, d.name));
    console.log(`  🗑️  Removed ${d.name}/ (neu build artifact)`);
  }
} catch (e) { /* ignore */ }
// Also delete any old cached resources.neu to prevent stale data
try {
  const oldCache = join(NEUTRALINO_CACHE_DIR, 'resources.neu');
  if (existsSync(oldCache)) {
    unlinkSync(oldCache);
    console.log('  🗑️  Removed stale cached resources.neu');
  }
} catch (e) { /* ignore */ }

// 5i. Ensure Node.js runtime for the target platform
await ensureNodeRuntime();

console.log('  ✅ Neutralino resources prepared');

// ═══════════════════════════════════════════════════════════
//  STEP 6: ASSEMBLE PACKAGE — ONE CLEAN ZIP
// ═══════════════════════════════════════════════════════════
console.log('  ── Step 6/6: Assembling distributable package...');

const distDir = join(prevDist, binaryName);
mkdirSync(distDir, { recursive: true });

// 6a. Copy Neutralino binary → AppName(.exe|no ext)
const binaryDest = join(distDir, `${binaryName}${pConfig.binaryExt}`);
cpSync(cachedBinary, binaryDest);
console.log(`  ✅ ${binaryName}${pConfig.binaryExt} (${(statSync(binaryDest).size / 1024 / 1024).toFixed(1)} MB)`);

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

// 6c. Copy game-config.json
writeFileSync(join(distDir, 'game-config.json'), JSON.stringify(gameConfig, null, 2), 'utf-8');

// 6d. Write launch script (bat for Windows, sh for macOS/Linux)
const launchScriptContent = pConfig.launchScriptContent(distDir);
const launchScriptPath = join(distDir, pConfig.launchScript);
writeFileSync(launchScriptPath, launchScriptContent, 'utf-8');
console.log(`  ✅ ${pConfig.launchScript}`);

// Make .sh executable (no-op on Windows but harmless)
if (targetPlatform !== 'win') {
  try {
    chmodSync(launchScriptPath, 0o755);
    console.log(`  ✅ ${pConfig.launchScript} made executable`);
  } catch (e) {
    console.warn(`  ⚠️  Could not chmod ${pConfig.launchScript}: ${e.message}`);
  }
}

// 6e. Copy node runtime
const distNodeDir = join(distDir, 'node');
mkdirSync(distNodeDir, { recursive: true });
const nodeSrcPath = join(NODE_CACHE_DIR, targetPlatform, pConfig.nodeFile);
cpSync(nodeSrcPath, join(distNodeDir, pConfig.nodeFile));
console.log(`  ✅ node/${pConfig.nodeFile} (${(statSync(join(distNodeDir, pConfig.nodeFile)).size / 1024 / 1024).toFixed(1)} MB)`);

// 6f. Copy standalone server
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

// Platform suffix for the ZIP filename
const platformSuffix = targetPlatform === 'win' ? '' : `-${targetPlatform}`;
const zipPath = join(prevDist, `${binaryName}${platformSuffix}.zip`);
const zip = new AdmZip();
addDirToZip(distDir, `${binaryName}/`, zip);
zip.writeZip(zipPath);

const zipSize = statSync(zipPath).size;

console.log('');
console.log('  ══════════════════════════════════════════════');
console.log(`  ✅ Build complete: ${productName}`);
console.log(`  💻 Platform: ${platformLabels[targetPlatform]}`);
console.log(`  📦 ${binaryName}${platformSuffix}.zip (${(zipSize / 1024 / 1024).toFixed(1)} MB)`);
console.log(`  📂 Path: ${zipPath}`);
console.log(`  📂 Unpacked: ${distDir}`);
console.log('');

if (targetPlatform === 'win') {
  console.log('  🚀 Extract ZIP and run the .exe');
  console.log('  ⚠️  Requires WebView2 (preinstalled on Windows 10/11)');
} else if (targetPlatform === 'mac') {
  console.log('  🚀 Extract ZIP, chmod +x the binary, and run it');
  console.log('  ⚠️  Uses WebKit (native on macOS)');
} else {
  console.log('  🚀 Extract ZIP, chmod +x the binary, and run it');
  console.log('  ⚠️  Requires WebKitGTK (install via package manager)');
}

console.log('  ══════════════════════════════════════════════');
console.log('');

})().catch(err => {
  console.error('  ❌ Unexpected error:', err);
  exit(1);
});
