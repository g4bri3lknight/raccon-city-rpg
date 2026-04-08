/**
 * Shared AI utility for z-ai-web-dev-sdk.
 *
 * Configuration priority:
 *  1. Environment variables: ZAI_BASE_URL + ZAI_API_KEY (+ optional ZAI_CHAT_ID, ZAI_USER_ID, ZAI_TOKEN)
 *  2. .z-ai-config file in project dir, home dir, or /etc
 *
 * If env vars are set, a .z-ai-config is auto-generated so the SDK can read it.
 * This lets users configure AI via .env without manually editing config files.
 */
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

type ZaiClient = Awaited<ReturnType<typeof ZAI.create>>;

let zaiInstance: ZaiClient | null = null;
let lastInitAttempt = 0;
const RETRY_INTERVAL_MS = 30_000;

/**
 * If ZAI_BASE_URL and ZAI_API_KEY are set in env, write a .z-ai-config
 * into the project root so that ZAI.create() can pick it up.
 * Returns true if config was written.
 */
function ensureConfigFromEnv(): boolean {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;

  if (!baseUrl || !apiKey) return false;

  const config: Record<string, string> = { baseUrl, apiKey };
  if (process.env.ZAI_CHAT_ID) config.chatId = process.env.ZAI_CHAT_ID;
  if (process.env.ZAI_USER_ID) config.userId = process.env.ZAI_USER_ID;
  if (process.env.ZAI_TOKEN) config.token = process.env.ZAI_TOKEN;

  const configPath = path.join(process.cwd(), '.z-ai-config');
  try {
    const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf-8') : '';
    const newContent = JSON.stringify(config, null, 2);

    // Only write if different (avoid unnecessary disk writes)
    if (existing.trim() !== newContent.trim()) {
      fs.writeFileSync(configPath, newContent, 'utf-8');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get or create the ZAI singleton. Retries automatically after failures.
 * Returns null if the AI service is unavailable (instead of throwing).
 */
export async function getZaiClient(): Promise<ZaiClient | null> {
  const now = Date.now();

  if (zaiInstance) return zaiInstance;

  if (now - lastInitAttempt < RETRY_INTERVAL_MS) {
    return null;
  }

  lastInitAttempt = now;

  // 1. Try to generate config from environment variables
  const envOk = ensureConfigFromEnv();

  // 2. Check if any config source exists
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
  ];
  const hasConfig = configPaths.some(p => {
    try { return fs.existsSync(p); } catch { return false; }
  });

  if (!hasConfig) {
    // No config at all — AI features disabled, don't spam logs
    return null;
  }

  try {
    zaiInstance = await ZAI.create();
    return zaiInstance;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('ECONNREFUSED') && !msg.includes('Configuration file not found')) {
      console.warn('[AI] z-ai-web-dev-sdk init failed:', msg);
    }
    zaiInstance = null;
    return null;
  }
}

/**
 * Reset the ZAI instance (e.g. after config change).
 */
export function resetZaiClient(): void {
  zaiInstance = null;
  lastInitAttempt = 0;
}
