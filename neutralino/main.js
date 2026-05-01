// Neutralinojs Background Script — RPG Editor
//
// This script runs as the Neutralino backend process and persists
// for the entire lifetime of the application, even after the window
// navigates to localhost:3000 (the main.js handler is NOT lost on redirect).
//
// Responsibilities:
//   - Dev mode (neu run): Start server, poll for readiness
//   - Portable mode: Kill the server process on window close (reads PID from server.pid)
//
// In portable builds, server startup is handled by index.html (client-side).
// This script's PRIMARY role in portable mode is CLEANUP on window close.

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

// ── Detect if running on Windows ──
function detectWindows() {
  try {
    var osInfo = Neutralino.os.getOsInfo();
    if (osInfo && osInfo.osId) {
      var osId = (osInfo.osId + '').toLowerCase();
      return osId === 'windows' || osId === 'win32';
    }
  } catch (e) {}
  // Default to Windows on unknown
  return true;
}

// ── Start server via batch file (dev mode only) ──
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
    // Save PID to file for cleanup
    try {
      await Neutralino.filesystem.writeFile(appDir + '/server.pid', String(serverPid));
      Neutralino.debug.log('Saved PID to server.pid');
    } catch (e) {
      Neutralino.debug.log('Could not save server.pid: ' + JSON.stringify(e));
    }
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

// ── Cleanup on close — kills ONLY the specific server process by PID ──
// In portable mode, index.html writes the PID to server.pid when starting the server.
// This handler reads that PID and kills only that process (not other node processes).
async function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    const appDir = NL_PATH.replace(/[\/\\]$/, '');
    var pidToKill = serverPid; // may be set if we started the server (dev mode)

    // If no PID in memory, read from file (portable mode)
    if (!pidToKill) {
      try {
        var pidStr = await Neutralino.filesystem.readFile(appDir + '/server.pid');
        pidToKill = parseInt(pidStr.trim(), 10);
        Neutralino.debug.log('Cleanup: read PID ' + pidToKill + ' from server.pid');
      } catch (e) {
        Neutralino.debug.log('Cleanup: no server.pid found');
      }
    }

    if (pidToKill && pidToKill > 0) {
      var isWin = detectWindows();
      if (isWin) {
        // Kill the specific process and its entire tree (children)
        // /PID = specific process, /T = kill child processes, /F = force
        await Neutralino.os.execCommand('taskkill /F /PID ' + pidToKill + ' /T', {});
        Neutralino.debug.log('Cleanup: killed process tree PID=' + pidToKill);
      } else {
        // Unix: kill children first, then parent
        await Neutralino.os.execCommand(
          'pkill -P ' + pidToKill + ' 2>/dev/null; kill ' + pidToKill + ' 2>/dev/null',
          {}
        );
        Neutralino.debug.log('Cleanup: killed process tree PID=' + pidToKill);
      }
    }
  } catch (e) {
    Neutralino.debug.log('Cleanup error: ' + JSON.stringify(e));
  }

  // Small delay to ensure the kill command completes before exiting
  await new Promise(function(r) { setTimeout(r, 300); });
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
