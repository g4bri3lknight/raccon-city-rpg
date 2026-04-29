// Neutralinojs Background Script — RPG Editor
// Manages the Next.js server lifecycle and game mode detection.
//
// Distribution structure:
//   AppDir/
//     RPG Editor.exe          ← NL_PATH points here
//     (resources embedded)    ← index.html, icons, neutralino.js, game-config.json
//     standalone/             ← Next.js standalone server (real files)
//       server.js
//       ...
//     node/
//       node.exe              ← Windows Node.js runtime
//
// Key distinction:
//   - /resources/* paths → Neutralino virtual filesystem (inside embedded .neu)
//   - NL_PATH/* paths    → Real OS filesystem (external files)

const Neutralino = global.Neutralino;

let serverPid = null;
let isShuttingDown = false;

// ── Read game config from embedded resources ──
async function readGameConfig() {
  try {
    // /resources/game-config.json is a Neutralino virtual path (inside .neu bundle)
    const content = await Neutralino.filesystem.readFile('/resources/game-config.json');
    return JSON.parse(content);
  } catch (e) {
    Neutralino.debug.log('No game-config.json found, using defaults');
    return null;
  }
}

// ── Start the Next.js server ──
async function startServer() {
  // NL_PATH = directory where the .exe is located (real filesystem)
  const appDir = NL_PATH.replace(/[\/\\]$/, '');

  // Read game config for title + game mode
  const gameConfig = await readGameConfig();

  // Set window title
  if (gameConfig && gameConfig.isGameOnly) {
    const title = gameConfig.gameName || gameConfig.gameId || 'RPG Game';
    Neutralino.window.setTitle(title);
  } else {
    Neutralino.window.setTitle('RPG Editor');
  }

  // Start Node.js server (REAL filesystem paths — NOT inside .neu bundle)
  const nodeExe = appDir + '/node/node.exe';
  const serverScript = appDir + '/standalone/server.js';

  Neutralino.debug.log('App directory: ' + appDir);
  Neutralino.debug.log('Starting server: ' + nodeExe + ' ' + serverScript);

  try {
    const result = await Neutralino.os.execCommand(
      '"' + nodeExe + '" "' + serverScript + '"',
      { background: true }
    );
    serverPid = result.pid;
    Neutralino.debug.log('Server started with PID: ' + serverPid);
  } catch (e) {
    Neutralino.debug.log('Failed to start server: ' + JSON.stringify(e));
  }
}

// ── Kill the server process tree ──
async function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (serverPid) {
    Neutralino.debug.log('Killing server PID: ' + serverPid);
    try {
      // Windows: taskkill /T /F kills the process tree
      await Neutralino.os.execCommand('taskkill /T /F /PID ' + serverPid);
    } catch (e) {
      Neutralino.debug.log('Kill error (process may already be dead): ' + JSON.stringify(e));
    }
    serverPid = null;
  }
}

// ── Initialize ──
Neutralino.init();

// Handle window close — clean up server before exiting
Neutralino.events.on('windowClose', async () => {
  Neutralino.debug.log('Window close requested');
  await cleanup();
  Neutralino.app.exit();
});

// Start the server
startServer().catch(err => {
  Neutralino.debug.log('Server start failed: ' + err);
});
