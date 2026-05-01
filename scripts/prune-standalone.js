#!/usr/bin/env node

/**
 * Prune Standalone — Remove unnecessary files from .next/standalone
 *
 * This script is called after `next build` to reduce the standalone output size
 * by removing files not needed for production runtime:
 *   • Locale/language files except English and Italian
 *   • TypeScript declaration files (.d.ts, .d.mts)
 *   • Source maps (.js.map)
 *   • Test directories
 *   • README/LICENSE/CHANGELOG files
 *   • Wrong-platform native binaries (Linux/macOS when building for Windows)
 *   • Unused packages (next-intl, electron, etc.)
 *   • Prisma schema engine (not needed at runtime)
 *
 * Usage:
 *   node scripts/prune-standalone.js [--dir=/path/to/standalone]
 */

const { existsSync, readdirSync, statSync, rmSync } = require('fs');
const { join } = require('path');
const { argv, exit, cwd } = require('process');

// Parse --dir argument
let baseDir = join(cwd(), '.next', 'standalone');
for (const arg of argv.slice(2)) {
  if (arg.startsWith('--dir=')) {
    baseDir = arg.slice(6);
  }
}

if (!existsSync(baseDir)) {
  console.error(`❌ Directory not found: ${baseDir}`);
  exit(1);
}

const nmDir = join(baseDir, 'node_modules');
if (!existsSync(nmDir)) {
  console.log('ℹ️  No node_modules/ in standalone, nothing to prune.');
  exit(0);
}

const LOCALES_TO_KEEP = new Set(['en', 'en-US', 'en-GB', 'it', 'it-IT', 'en-CA', 'en-AU']);
let totalSaved = 0;

function safeRemove(path) {
  try {
    if (existsSync(path)) rmSync(path, { recursive: true, force: true });
  } catch { /* ignore */ }
}

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

function removeEntry(path, label) {
  try {
    const st = statSync(path);
    const size = st.isDirectory() ? calcDirSize(path) : st.size;
    safeRemove(path);
    totalSaved += size;
    if (size > 1024 * 1024) {
      console.log(`  ✂️  ${label} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    } else if (size > 1024) {
      console.log(`  ✂️  ${label} (${(size / 1024).toFixed(0)} KB)`);
    }
  } catch { /* ignore */ }
}

console.log('');
console.log(`🧹 Pruning standalone: ${baseDir}`);
console.log(`📏 Size before: ${(calcDirSize(baseDir) / 1024 / 1024).toFixed(1)} MB`);
console.log('');

// 1. date-fns locales
const dateFnsLocaleDir = join(nmDir, 'date-fns', 'locale');
if (existsSync(dateFnsLocaleDir)) {
  try {
    const entries = readdirSync(dateFnsLocaleDir, { withFileTypes: true });
    for (const entry of entries) {
      const baseName = entry.name.split('.')[0];
      if (!LOCALES_TO_KEEP.has(baseName)) {
        removeEntry(join(dateFnsLocaleDir, entry.name), `date-fns locale: ${entry.name}`);
      }
    }
  } catch { /* ignore */ }
}

// 2. react-syntax-highlighter language files
for (const sub of ['dist/esm/languages/prism', 'dist/esm/languages/hljs', 'dist/cjs/languages/prism', 'dist/cjs/languages/hljs']) {
  const langDir = join(nmDir, 'react-syntax-highlighter', sub);
  if (existsSync(langDir)) {
    removeEntry(langDir, `react-syntax-highlighter ${sub.split('/').pop()}`);
  }
}

// 3. Remove next-intl (not used)
removeEntry(join(nmDir, 'next-intl'), 'next-intl (unused)');

// 4. Wrong-platform native binaries
for (const p of [
  '@img/sharp-libvips-linux-x64', '@img/sharp-libvips-linuxmusl-x64',
  '@img/sharp-linux-x64', '@img/sharp-linuxmusl-x64',
  '@img/sharp-darwin-x64', '@img/sharp-darwin-arm64',
  'sharp/linux-x64', 'sharp/linuxmusl-x64', 'sharp/darwin-x64', 'sharp/darwin-arm64',
  'sharp/libvips-linux-x64', 'sharp/libvips-linuxmusl-x64', 'sharp/libvips-darwin-x64', 'sharp/libvips-darwin-arm64',
]) {
  removeEntry(join(nmDir, p), p);
}

// 5. Prisma schema engine (not needed at runtime)
removeEntry(join(nmDir, '@prisma/engines/schema-engine-debian-openssl-3.0.x'), 'Prisma schema-engine');
removeEntry(join(nmDir, '@prisma/engines/schema-engine'), 'Prisma schema-engine');

// 6. Electron (should never be there, but just in case)
removeEntry(join(nmDir, 'electron'), 'electron');
removeEntry(join(nmDir, 'electron-builder'), 'electron-builder');

// 7. TypeScript declaration files
let dtsCount = 0, dtsSize = 0;
function removeDts(dir, depth) {
  if (depth > 8) return;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) removeDts(p, depth + 1);
      else if (e.name.endsWith('.d.ts') || e.name.endsWith('.d.mts') || e.name.endsWith('.d.cts')) {
        try { dtsSize += statSync(p).size; safeRemove(p); dtsCount++; } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}
removeDts(nmDir, 0);
totalSaved += dtsSize;
if (dtsCount > 0) console.log(`  ✂️  ${dtsCount} TypeScript declaration files (${(dtsSize / 1024).toFixed(0)} KB)`);

// 8. Source maps
let mapCount = 0, mapSize = 0;
function removeMaps(dir, depth) {
  if (depth > 8) return;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) removeMaps(p, depth + 1);
      else if (e.name.endsWith('.map')) {
        try { mapSize += statSync(p).size; safeRemove(p); mapCount++; } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}
removeMaps(nmDir, 0);
totalSaved += mapSize;
if (mapCount > 0) console.log(`  ✂️  ${mapCount} source map files (${(mapSize / 1024).toFixed(0)} KB)`);

// 9. Metadata/doc files
const metaFiles = new Set(['README.md', 'README', 'LICENSE', 'LICENSE.md', 'CHANGELOG.md', 'CHANGELOG', 'HISTORY.md', 'AUTHORS', '.eslintrc.js', '.prettierrc', 'tsconfig.json', 'Makefile', 'bower.json']);
let metaCount = 0, metaSize = 0;
function removeMeta(dir, depth) {
  if (depth > 4) return;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory() && depth < 2) removeMeta(p, depth + 1);
      else if (e.isFile() && metaFiles.has(e.name)) {
        try { metaSize += statSync(p).size; safeRemove(p); metaCount++; } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}
removeMeta(nmDir, 0);
totalSaved += metaSize;
if (metaCount > 0) console.log(`  ✂️  ${metaCount} metadata/doc files (${(metaSize / 1024).toFixed(0)} KB)`);

// 10. Test directories
const testDirs = new Set(['__tests__', '__mocks__', 'test', 'tests', 'coverage']);
let testCount = 0, testSize = 0;
function removeTests(dir, depth) {
  if (depth > 4) return;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && testDirs.has(e.name)) {
        const p = join(dir, e.name);
        testSize += calcDirSize(p);
        safeRemove(p);
        testCount++;
      } else if (e.isDirectory() && depth < 3) {
        removeTests(join(dir, e.name), depth + 1);
      }
    }
  } catch { /* ignore */ }
}
removeTests(nmDir, 0);
totalSaved += testSize;
if (testCount > 0) console.log(`  ✂️  ${testCount} test directories (${(testSize / 1024 / 1024).toFixed(1)} MB)`);

// 11. Extra Prisma client files (src, scripts, generator-build)
safeRemove(join(nmDir, '.prisma', 'client', 'src'));
safeRemove(join(nmDir, '.prisma', 'client', 'scripts'));
safeRemove(join(nmDir, '.prisma', 'client', 'generator-build'));

const sizeAfter = calcDirSize(baseDir);
console.log('');
console.log(`📏 Size after: ${(sizeAfter / 1024 / 1024).toFixed(1)} MB`);
console.log(`💾 Saved: ${((totalSaved) / 1024 / 1024).toFixed(1)} MB`);
console.log('');
