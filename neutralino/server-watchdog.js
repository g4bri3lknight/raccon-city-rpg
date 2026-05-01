#!/usr/bin/env node

/**
 * Server Watchdog — Monitors Neutralino heartbeat and kills the Node.js server
 * when the Neutralino executable is closed.
 *
 * How it works:
 *   1. index.html (running in Neutralino webview) writes a timestamp to
 *      "heartbeat.tmp" every 2 seconds via Neutralino.filesystem.writeFile().
 *   2. This watchdog spawns the actual Node.js server as a child process.
 *   3. Every 2 seconds, it reads heartbeat.tmp.
 *   4. If the heartbeat is stale (>8 seconds old), it means the Neutralino
 *      process has been closed (user closed the exe window).
 *   5. The watchdog then kills the server child process and exits.
 *
 * This approach is necessary because:
 *   - main.js (Neutralino background script) is compiled into the pre-built
 *     binary downloaded from GitHub, so our custom windowClose handler never runs.
 *   - The windowClose event in index.html doesn't fire reliably on Windows.
 *   - The heartbeat file is written by the webview JS, which stops when the
 *     Neutralino process exits.
 *
 * Usage: node server-watchdog.js
 *   Expects to be run from the same directory as the exe.
 *   heartbeat.tmp is in the same directory.
 *   server.js is in the standalone/ subdirectory.
 */

const { spawn } = require('child_process');
const { readFileSync, existsSync, unlinkSync, statSync } = require('fs');
const { join } = require('path');

// ── Configuration ──
const APP_DIR = __dirname;                          // Directory containing this file (next to exe)
const HEARTBEAT_FILE = join(APP_DIR, 'heartbeat.tmp');
const STANDALONE_DIR = join(APP_DIR, 'standalone');
const NODE_BIN = join(APP_DIR, 'node');

// Detect platform
const isWindows = process.platform === 'win32';
const nodeBin = isWindows ? join(NODE_BIN, 'node.exe') : join(NODE_BIN, 'node');

// Timing
const GRACE_PERIOD = 20000;     // 20s grace period (server startup + index.html loading)
const CHECK_INTERVAL = 2000;    // Check heartbeat every 2 seconds
const STALE_THRESHOLD = 8000;   // Heartbeat older than 8s = Neutralino dead
const MAX_STALE_COUNT = 3;      // Allow 3 consecutive stale reads before killing
const KILL_TIMEOUT = 5000;      // Wait 5s after SIGTERM before SIGKILL

// ── State ──
let serverProcess = null;
let staleCount = 0;
let monitoring = false;
let isShuttingDown = false;

// ── Start the Next.js server ──
function startServer() {
  const serverJs = join(STANDALONE_DIR, 'server.js');

  if (!existsSync(serverJs)) {
    console.error('[watchdog] ERROR: standalone/server.js not found at: ' + serverJs);
    process.exit(1);
  }

  if (!existsSync(nodeBin)) {
    console.error('[watchdog] ERROR: node binary not found at: ' + nodeBin);
    process.exit(1);
  }

  console.log('[watchdog] Starting server: ' + nodeBin + ' ' + serverJs);

  serverProcess = spawn(nodeBin, [serverJs], {
    cwd: STANDALONE_DIR,
    stdio: 'inherit',
    env: { ...process.env },
  });

  serverProcess.on('error', (err) => {
    console.error('[watchdog] Server process error:', err.message);
    cleanup();
  });

  serverProcess.on('exit', (code, signal) => {
    console.log('[watchdog] Server exited (code=' + code + ', signal=' + signal + ')');
    serverProcess = null;
    cleanup();
  });
}

// ── Kill the server process ──
function killServer() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('[watchdog] Neutralino appears closed — shutting down server...');

  // Clean up heartbeat file
  try { unlinkSync(HEARTBEAT_FILE); } catch {}

  if (serverProcess && !serverProcess.killed) {
    try {
      // On Windows, we need to kill the entire process tree
      if (isWindows) {
        // Use taskkill to kill the process tree
        spawn('taskkill', ['/PID', String(serverProcess.pid), '/T', '/F'], {
          stdio: 'ignore',
        }).on('exit', () => {
          console.log('[watchdog] Server killed (taskkill)');
          process.exit(0);
        });
      } else {
        serverProcess.kill('SIGTERM');
        // Give it time to shut down gracefully
        setTimeout(() => {
          if (serverProcess && !serverProcess.killed) {
            try { serverProcess.kill('SIGKILL'); } catch {}
          }
          process.exit(0);
        }, KILL_TIMEOUT);
      }
    } catch (e) {
      // Fallback
      try { serverProcess.kill(); } catch {}
      process.exit(0);
    }
  } else {
    process.exit(0);
  }
}

// ── Check heartbeat file ──
function checkHeartbeat() {
  try {
    if (!existsSync(HEARTBEAT_FILE)) {
      staleCount++;
      console.log('[watchdog] Heartbeat file missing (' + staleCount + '/' + MAX_STALE_COUNT + ')');
      if (staleCount >= MAX_STALE_COUNT) {
        killServer();
      }
      return;
    }

    const content = readFileSync(HEARTBEAT_FILE, 'utf-8').trim();
    const timestamp = parseInt(content, 10);

    if (isNaN(timestamp)) {
      staleCount++;
      console.log('[watchdog] Invalid heartbeat content (' + staleCount + '/' + MAX_STALE_COUNT + ')');
      if (staleCount >= MAX_STALE_COUNT) {
        killServer();
      }
      return;
    }

    const age = Date.now() - timestamp;

    if (age > STALE_THRESHOLD) {
      staleCount++;
      console.log('[watchdog] Heartbeat stale (' + Math.round(age / 1000) + 's old, ' + staleCount + '/' + MAX_STALE_COUNT + ')');
      if (staleCount >= MAX_STALE_COUNT) {
        killServer();
      }
    } else {
      // Heartbeat is fresh, reset counter
      if (staleCount > 0) {
        console.log('[watchdog] Heartbeat recovered');
      }
      staleCount = 0;
    }
  } catch (e) {
    // File might be locked by Neutralino's writeFile — don't count as stale
    // if it's just a transient read error
    staleCount++;
    if (staleCount >= MAX_STALE_COUNT + 5) {
      // Very tolerant for read errors (up to 8 consecutive failures)
      console.log('[watchdog] Heartbeat read error, giving up: ' + e.message);
      killServer();
    }
  }
}

// ── Cleanup on exit (normal shutdown) ──
function cleanup() {
  try { unlinkSync(HEARTBEAT_FILE); } catch {}
  if (!isShuttingDown) {
    process.exit(0);
  }
}

// ── Handle process signals ──
process.on('SIGTERM', () => { killServer(); });
process.on('SIGINT', () => { killServer(); });

// ── Main ──
console.log('[watchdog] RPG Editor Server Watchdog started');
console.log('[watchdog] App dir: ' + APP_DIR);
console.log('[watchdog] Heartbeat: ' + HEARTBEAT_FILE);
console.log('[watchdog] Grace period: ' + Math.round(GRACE_PERIOD / 1000) + 's');

// Start the server
startServer();

// Wait for grace period before monitoring
// This gives the server time to start and index.html time to begin writing heartbeat
setTimeout(() => {
  monitoring = true;
  console.log('[watchdog] Starting heartbeat monitoring (check every ' + Math.round(CHECK_INTERVAL / 1000) + 's, stale threshold ' + Math.round(STALE_THRESHOLD / 1000) + 's)');
  setInterval(checkHeartbeat, CHECK_INTERVAL);
}, GRACE_PERIOD);
