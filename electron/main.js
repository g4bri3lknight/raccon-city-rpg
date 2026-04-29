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
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Log to file ──
const LOG_DIR = app.isPackaged
  ? path.dirname(app.getPath('exe'))
  : path.join(__dirname, '..');

const LOG_FILE = path.join(LOG_DIR, 'electron-debug.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line, 'utf-8'); } catch {}
  console.log(msg);
}

log('=== Electron starting ===');
log(`platform: ${process.platform}`);
log(`arch: ${process.arch}`);
log(`isPackaged: ${app.isPackaged}`);
log(`resourcesPath: ${process.resourcesPath || 'N/A'}`);
log(`__dirname: ${__dirname}`);
log(`exePath: ${app.getPath('exe')}`);
log(`argv: ${JSON.stringify(process.argv)}`);

// ── Parse command line ──
const args = process.argv.slice(2);

function findGameId(args) {
  const eqArg = args.find(a => a.startsWith('--game='));
  if (eqArg) { const id = eqArg.split('=').slice(1).join('='); if (id) return id; }
  const idx = args.indexOf('--game');
  if (idx !== -1 && idx + 1 < args.length) {
    const id = args[idx + 1];
    if (id && !id.startsWith('--')) return id;
  }
  return null;
}

let gameId = findGameId(args);
let isGameOnly = !!(gameId || process.env.GAME_ONLY);
let effectiveGameId = gameId || process.env.GAME_ID || null;

// Try to read game-config.json (written by build script)
// This is the SOLE source of truth for packaged EXEs (no CLI args at runtime)
let gameConfig = null;
try {
  const configPath = app.isPackaged
    ? path.join(process.resourcesPath, 'standalone', 'game-config.json')
    : path.join(__dirname, '..', '.next', 'standalone', 'game-config.json');
  if (fs.existsSync(configPath)) {
    gameConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    log(`Loaded game-config.json: ${JSON.stringify(gameConfig)}`);

    // Override mode from config if no CLI args were given
    // (packaged EXEs are launched without --game flag)
    if (!gameId && gameConfig.gameId && gameConfig.isGameOnly) {
      gameId = gameConfig.gameId;
      isGameOnly = true;
      effectiveGameId = gameConfig.gameId;
      log(`Mode overridden by game-config.json → game-only: ${effectiveGameId}`);
    }
  }
} catch (e) {
  log(`Could not read game-config.json: ${e.message}`);
}

const productName = gameConfig?.productName || (isGameOnly ? effectiveGameId : 'RPG Game Editor');

log(`gameId: ${effectiveGameId}, isGameOnly: ${isGameOnly}, productName: ${productName}`);

let mainWindow = null;
let serverProcess = null;

// ── Paths ──
// electron/main.js is inside app.asar
// standalone server is at resources/standalone/ (real files, outside asar)
function getStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'standalone');
  }
  return path.join(__dirname, '..', '.next', 'standalone');
}

function getServerFile() {
  return path.join(getStandaloneDir(), 'server.js');
}

function getDbDir() {
  if (process.env.GAMES_DIR) return process.env.GAMES_DIR;
  return path.join(getStandaloneDir(), 'db', 'games');
}

function getActiveGameFile() {
  if (process.env.ACTIVE_GAME_FILE) return process.env.ACTIVE_GAME_FILE;
  return path.join(getStandaloneDir(), 'db', '.active-game');
}

// ── Start Next.js Server ──
function startServer() {
  const standaloneDir = getStandaloneDir();
  const serverFile = getServerFile();

  log(`Standalone dir: ${standaloneDir}`);
  log(`Server file: ${serverFile}`);
  log(`Server exists: ${fs.existsSync(serverFile)}`);

  // Debug: list resources dir contents
  if (app.isPackaged) {
    try {
      const resContents = fs.readdirSync(process.resourcesPath);
      log(`resourcesPath contents: ${JSON.stringify(resContents)}`);

      if (fs.existsSync(standaloneDir)) {
        const saContents = fs.readdirSync(standaloneDir);
        log(`standalone dir contents: ${JSON.stringify(saContents.slice(0, 20))}`);
      } else {
        log(`ERROR: standalone dir does NOT exist!`);
      }
    } catch (e) {
      log(`Error listing dirs: ${e.message}`);
    }
  }

  if (!fs.existsSync(serverFile)) {
    log(`FATAL: server.js NOT FOUND`);
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Errore di avvio',
      `server.js non trovato.\n\nControlla electron-debug.log nella cartella dell'eseguibile.`
    );
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
    // CRITICAL: Make Electron binary act as plain Node.js
    ELECTRON_RUN_AS_NODE: '1',
    // Pass game ID for game-only mode
    GAME_ONLY: isGameOnly ? 'true' : '',
    GAME_ID: effectiveGameId || '',
  };

  log(`Starting server...`);
  log(`DB dir: ${dbDir}`);
  log(`Mode: ${isGameOnly ? `Game-only (${effectiveGameId})` : 'Full Editor'}`);

  serverProcess = spawn(process.execPath, [serverFile], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: standaloneDir,
  });

  let serverReady = false;

  serverProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    log(`[Server OUT] ${msg.trim()}`);

    if (!serverReady && (
      msg.includes('Ready') ||
      msg.includes('started') ||
      msg.includes('listening') ||
      msg.includes('3111')
    )) {
      serverReady = true;
      log('Server ready, opening window...');
      createWindow();
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    log(`[Server ERR] ${msg.trim()}`);
    if (!serverReady && (msg.includes('Error') || msg.includes('Cannot find') || msg.includes('MODULE_NOT_FOUND'))) {
      serverReady = true;
      createWindow();
    }
  });

  serverProcess.on('error', (err) => {
    log(`FATAL: Server spawn error: ${err.message}`);
    const { dialog } = require('electron');
    dialog.showErrorBox('Errore', `Impossibile avviare il server.\nControlla electron-debug.log.`);
    app.quit();
  });

  serverProcess.on('close', (code) => {
    log(`Server exited with code ${code}`);
  });

  // Fallback
  setTimeout(() => {
    if (!serverReady) {
      serverReady = true;
      log('Timeout 10s, opening window anyway...');
      createWindow();
    }
  }, 10000);
}

// ── Create Browser Window ──
function createWindow() {
  if (mainWindow) return;

  const url = isGameOnly && effectiveGameId
    ? `http://127.0.0.1:3111/?mode=play&gameId=${encodeURIComponent(effectiveGameId)}`
    : 'http://127.0.0.1:3111/';

  const title = productName;

  log(`Opening window: ${url}`);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(url);
  mainWindow.setMenuBarVisibility(false);

  // DevTools: ONLY open if explicitly requested via --devtools flag
  if (args.includes('--devtools')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App Lifecycle ──
app.whenReady().then(() => {
  log('Electron app ready');
  startServer();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Clean up server process BEFORE exiting
  shutdown();
  app.exit(0);
});

app.on('before-quit', () => { shutdown(); });

let isShuttingDown = false;
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  if (serverProcess) {
    const pid = serverProcess.pid;
    log(`Shutting down server (PID: ${pid})...`);

    if (process.platform === 'win32') {
      // Windows: SIGTERM/SIGKILL don't work reliably.
      // Use taskkill /T /F to kill the process tree (process + all children)
      try {
        execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
        log('Server killed via taskkill');
      } catch {
        // Fallback: just kill the main process
        try { serverProcess.kill('SIGKILL'); } catch {}
      }
    } else {
      // Unix: SIGTERM first, SIGKILL after 3s
      try { serverProcess.kill('SIGTERM'); } catch {}
      setTimeout(() => {
        try { if (pid) process.kill(pid, 'SIGKILL'); } catch {}
      }, 3000);
    }
    serverProcess = null;
  }
}
