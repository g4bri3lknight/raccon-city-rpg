/**
 * Admin API authentication utility.
 *
 * Stores the admin key in memory (NOT localStorage for security).
 * Provides `adminFetch()` — a drop-in replacement for `fetch()` that
 * automatically attaches the `x-admin-key` header to every request
 * targeting `/api/admin/`.
 */

// ── In-memory key storage (never persisted to disk) ──────────────
let _adminKey: string | null = null;

/** Default key matching the middleware fallback */
const DEFAULT_KEY = 'raccoon_admin_2024';

/** Set the admin key (called once after user enters it). Trims whitespace and ignores empty strings. */
export function setAdminKey(key: string) {
  const trimmed = key.trim();
  _adminKey = trimmed.length > 0 ? trimmed : null;
}

/** Get the current admin key, falling back to the default. Never returns empty string. */
export function getAdminKey(): string {
  if (_adminKey && _adminKey.trim().length > 0) return _adminKey;
  return DEFAULT_KEY;
}

/** Check whether a custom key has been set (vs using the default). */
export function hasCustomKey(): boolean {
  return _adminKey !== null && _adminKey.trim().length > 0;
}

/**
 * Test if an admin key works by making a lightweight request.
 * Returns true if the key is accepted (200), false if rejected (401).
 */
export async function testAdminKey(key: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/items?admin_key=' + encodeURIComponent(key.trim() || DEFAULT_KEY), {
      method: 'GET',
      headers: { 'x-admin-key': key.trim() || DEFAULT_KEY },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Drop-in replacement for `fetch()` when calling `/api/admin/*` endpoints.
 *
 * Automatically injects the `x-admin-key` header into every request whose
 * URL starts with `/api/admin`. All other URLs are passed through unchanged.
 */
export function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  // Only augment requests to admin endpoints
  if (!url.startsWith('/api/admin')) {
    return fetch(input, init);
  }

  const headers = new Headers(init?.headers);
  headers.set('x-admin-key', getAdminKey());

  return fetch(input, {
    ...init,
    headers,
  });
}
