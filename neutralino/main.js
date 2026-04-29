// Neutralinojs Background Script — RPG Editor
//
// ⚠️  DEPRECATED: This file is kept for reference only.
//
// In the distributed portable build, the Neutralino binary downloaded from GitHub
// does NOT have this main.js embedded. Server startup logic has been moved to
// neutralino/resources/index.html (client-side), which runs inside resources.neu
// and uses the Neutralino client API (Neutralino.os.execCommand, etc.)
//
// This file is only used when running `neu run` during development.

const Neutralino = global.Neutralino;

let serverPid = null;
let isShuttingDown = false;

// ── Read game config ──
async function readGameConfig(appDir) {
  try {
    const content = await Neutralino.filesystem.readFile('/resources/game-config.json');
    return JSON.parse(content);
  } catch (e) { /* not embedded, try filesystem */ }
  try {
    const content = await Neutralino.filesystem.readFile(appDir + '/game-config.json');
    return JSON.parse(content);
  } catch (e) { /* no config, use defaults */ }
  return null;
}

// ── Start server via batch file ──
async function startServer() {
  const appDir = NL_PATH.replace(/[\/\\]$/, '');
  const gameConfig = await readGameConfig(appDir);

  if (gameConfig && gameConfig.isGameOnly) {
    Neutralino.window.setTitle(gameConfig.gameName || gameConfig.gameId || 'RPG Game');
  } else {
    Neutralino.window.setTitle('RPG Editor');
  }

  const batFile = appDir + '/start-server.bat';

  Neutralino.debug.log('=== RPG Editor Starting (dev mode) ===');
  Neutralino.debug.log('AppDir: ' + appDir);

  try {
    await Neutralino.filesystem.getStats(batFile);
  } catch (e) {
    Neutralino.debug.log('FATAL: start-server.bat not found!');
    return;
  }

  try {
    Neutralino.debug.log('Running start-server.bat...');
    const result = await Neutralino.os.execCommand(
      '"' + batFile + '"',
      { background: true }
    );
    serverPid = result.pid;
    Neutralino.debug.log('Batch PID: ' + serverPid);
  } catch (e) {
    Neutralino.debug.log('ERROR: ' + JSON.stringify(e));
    return;
  }

  // Poll until server responds
  for (var i = 0; i < 60; i++) {
    await new Promise(function(r) { setTimeout(r, 1000); });
    if (isShuttingDown) return;

    try {
      var ns = await Neutralino.os.execCommand(
        'netstat -an | findstr ":3000.*LISTENING"', {}
      );
      if (ns.stdout && ns.stdout.trim().length > 0) {
        Neutralino.debug.log('Server READY! Port 3000 is listening.');
        return;
      }
    } catch (e) { /* ignore */ }

    if (i % 10 === 0 && i > 0) {
      Neutralino.debug.log('Waiting for server... (' + (i + 1) + 's)');
    }
  }

  Neutralino.debug.log('WARNING: Server did not start after 60s');
}

// ── Cleanup on close ──
async function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    await Neutralino.os.execCommand('taskkill /F /IM node.exe /T', {});
  } catch (e) { /* already dead */ }
}

// ── Init ──
Neutralino.init();

Neutralino.events.on('windowClose', async function() {
  await cleanup();
  Neutralino.app.exit();
});

startServer().catch(function(err) {
  Neutralino.debug.log('FATAL: ' + err);
});
