import { NextResponse } from 'next/server';

/**
 * Middleware: all API routes are now public (no admin key required).
 * The editor is always visible, so authentication is no longer needed.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/games/:path*',
    '/rpg-data.zip',
  ],
};
