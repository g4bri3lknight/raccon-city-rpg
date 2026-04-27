/**
 * Electron Preload Script — RPG Game
 *
 * This runs in the renderer process before any web content loads.
 * It exposes a safe bridge between the renderer and main process.
 *
 * Context isolation is enabled, so we use contextBridge
 * to expose only specific APIs to the renderer.
 */

const { contextBridge } = require('electron');

// Expose Electron info to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
});
