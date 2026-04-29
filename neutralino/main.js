// Neutralinojs Background Script — RPG Editor
// Manages the Next.js server lifecycle and game mode detection.
//
// Distribution:
//   AppDir/
//     AppName.exe             ← Neutralino binary
//     start-server.bat        ← Launches Next.js server with correct CWD
//     resources.neu           ← UI bundle (index.html, icons, neutralino.js, config)
//     standalone/             ← Next.js standalone server
//     node/node.exe           ← Windows Node.js runtime
//     game-config.json        ← Game mode configuration

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

  Neutralino.debug.log('=== RPG Editor Starting ===');
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

    // Use netstat to check if port 3000 is LISTENING
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

  // Kill any node.exe process we spawned
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
