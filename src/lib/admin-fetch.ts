/**
 * adminFetch — thin wrapper around fetch().
 *
 * Previously injected an x-admin-key header for authentication.
 * Auth has been removed (middleware is now pass-through), so this
 * is just a straight pass-through. Kept as an alias so every
 * call-site (100+ references) doesn't need updating.
 */

/** No-op: kept for backward compatibility with existing imports. */
export function setAdminKey(_key: string) {}

export function getAdminKey(): string {
  return '';
}

export function hasCustomKey(): boolean {
  return false;
}

export async function testAdminKey(_key: string): Promise<boolean> {
  return true;
}

/** Drop-in replacement for fetch() — now just passes through. */
export function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}
