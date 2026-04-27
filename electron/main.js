/**
 * Electron Main Process — RPG Game Editor / Player
 *
 * Modes:
 *   1. Editor mode (default):  electron/main.js
 *      → Full editor + all games
 *
 *   2. Game-only mode:          electron/main.js --game=raccoon-city
 *      → Only that specific game, skips dashboard
 *
 * Environment variables (set by build script):
 *   GAME_ONLY=true / GAME_ID=xxx  → game-only mode
 *   GAMES_DIR=path                → custom games DB directory
 *   ACTIVE_GAME_FILE=path          → custom active game tracker
 */

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Parse command line ──
const args = process.argv.slice(2);
const gameArg = args.find(a => a.startsWith('--game='));
const gameId = gameArg ? gameArg.split('=')[1] : null;
const isGameOnly = !!(gameId || process.env.GAME_ONLY);

const effectiveGameId = gameId || process.env.GAME_ID || null;

let mainWindow = null;
let serverProcess = null;

// ── Paths ──
function getAppDir() {
  if (app.isPackaged) {
    // In packaged app, standalone server is in resources/app/
    return path.join(process.resourcesPath, 'app');
  }
  // In development, it's in the project root .next/standalone/
  return path.join(__dirname, '..', '.next', 'standalone');
}

function getDbDir() {
  if (process.env.GAMES_DIR) return process.env.GAMES_DIR;
  if (app.isPackaged) {
    // Portable: DB next to the executable
    return path.join(path.dirname(app.getPath('exe')), 'db', 'games');
  }
  return path.join(__dirname, '..', 'db', 'games');
}

function getActiveGameFile() {
  if (process.env.ACTIVE_GAME_FILE) return process.env.ACTIVE_GAME_FILE;
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'db', '.active-game');
  }
  return path.join(__dirname, '..', 'db', '.active-game');
}

// ── Start Next.js Server ──
function startServer() {
  const appDir = getAppDir();
  const serverFile = path.join(appDir, 'server.js');

  if (!fs.existsSync(serverFile)) {
    console.error(`[Electron] Server not found at: ${serverFile}`);
    app.quit();
    return;
  }

  // Ensure DB directory exists
  const dbDir = getDbDir();
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Ensure .active-game file exists for game-only mode
  if (isGameOnly && effectiveGameId) {
    const activeFile = getActiveGameFile();
    const activeDir = path.dirname(activeFile);
    if (!fs.existsSync(activeDir)) {
      fs.mkdirSync(activeDir, { recursive: true });
    }
    fs.writeFileSync(activeFile, effectiveGameId, 'utf-8');
  }

  const env = {
    ...process.env,
    PORT: '3111',
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    GAMES_DIR: dbDir,
    ACTIVE_GAME_FILE: getActiveGameFile(),
  };

  console.log(`[Electron] Starting server from: ${appDir}`);
  console.log(`[Electron] DB directory: ${dbDir}`);
  console.log(`[Electron] Mode: ${isGameOnly ? `Game-only (${effectiveGameId})` : 'Full Editor'}`);

  serverProcess = spawn(process.execPath, [serverFile], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: appDir,
  });

  let serverReady = false;

  serverProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log('[Server]', msg.trim());

    if (!serverReady && (
      msg.includes('Ready') ||
      msg.includes('started') ||
      msg.includes('listening') ||
      msg.includes('3111')
    )) {
      serverReady = true;
      createWindow();
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    console.error('[Server Error]', msg.trim());
  });

  serverProcess.on('error', (err) => {
    console.error('[Electron] Server process error:', err);
  });

  serverProcess.on('close', (code) => {
    console.log(`[Electron] Server exited with code ${code}`);
  });

  // Fallback: open window after timeout even if server doesn't signal ready
  setTimeout(() => {
    if (!serverReady) {
      serverReady = true;
      createWindow();
    }
  }, 8000);
}

// ── Create Browser Window ──
function createWindow() {
  if (mainWindow) return;

  const url = isGameOnly && effectiveGameId
    ? `http://127.0.0.1:3111/?mode=play&gameId=${encodeURIComponent(effectiveGameId)}`
    : 'http://127.0.0.1:3111/';

  const title = isGameOnly
    ? `${effectiveGameId}`
    : 'RPG Game Editor';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(url);

  // Hide menu bar (looks cleaner for a game)
  mainWindow.setMenuBarVisibility(false);

  // Open DevTools in dev mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App Lifecycle ──
app.whenReady().then(() => {
  startServer();

  app.on('activate', () => {
    // macOS: re-create window when dock icon clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep app alive even with no windows
  if (process.platform !== 'darwin') {
    shutdown();
  }
});

app.on('before-quit', () => {
  shutdown();
});

function shutdown() {
  if (serverProcess) {
    console.log('[Electron] Shutting down server...');
    serverProcess.kill('SIGTERM');
    // Force kill after 3s
    setTimeout(() => {
      try { serverProcess.kill('SIGKILL'); } catch {}
    }, 3000);
    serverProcess = null;
  }
}
