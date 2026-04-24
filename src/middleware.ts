import { NextRequest, NextResponse } from 'next/server';

const ADMIN_KEY = process.env.ADMIN_KEY || 'raccoon_admin_2024';

export function middleware(request: NextRequest) {
  const providedKey =
    request.headers.get('x-admin-key') ||
    request.nextUrl.searchParams.get('admin_key');

  if (providedKey !== ADMIN_KEY) {
    return NextResponse.json(
      { error: 'Non autorizzato. Fornisci l\'header x-admin-key o il parametro admin_key.' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

// NOTE: /api/admin/upload/* is intentionally EXCLUDED from the matcher to avoid
// the 10MB body size limit imposed by the middleware framework.
// Upload routes handle auth directly in their route handlers.
export const config = {
  matcher: [
    '/api/admin/achievements/:path*',
    '/api/admin/avatars/:path*',
    '/api/admin/boss-phases/:path*',
    '/api/admin/characters/:path*',
    '/api/admin/documents/:path*',
    '/api/admin/endings/:path*',
    '/api/admin/enemies/:path*',
    '/api/admin/enemy-abilities/:path*',
    '/api/admin/events/:path*',
    '/api/admin/export-data/:path*',
    '/api/admin/game-settings/:path*',
    '/api/admin/images/:path*',
    '/api/admin/items/:path*',
    '/api/admin/locations/:path*',
    '/api/admin/notifications/:path*',
    '/api/admin/npcs/:path*',
    '/api/admin/quest-chains/:path*',
    '/api/admin/quests/:path*',
    '/api/admin/recipes/:path*',
    '/api/admin/refresh/:path*',
    '/api/admin/secret-rooms/:path*',
    '/api/admin/seed/:path*',
    '/api/admin/seed-achievements/:path*',
    '/api/admin/seed-all/:path*',
    '/api/admin/seed-avatars/:path*',
    '/api/admin/seed-boss-phases/:path*',
    '/api/admin/seed-characters/:path*',
    '/api/admin/seed-documents/:path*',
    '/api/admin/seed-endings/:path*',
    '/api/admin/seed-enemies/:path*',
    '/api/admin/seed-enemy-abilities/:path*',
    '/api/admin/seed-equipment/:path*',
    '/api/admin/seed-events/:path*',
    '/api/admin/seed-items/:path*',
    '/api/admin/seed-locations/:path*',
    '/api/admin/seed-notifications/:path*',
    '/api/admin/seed-npcs/:path*',
    '/api/admin/seed-quest-chains/:path*',
    '/api/admin/seed-quests/:path*',
    '/api/admin/seed-recipes/:path*',
    '/api/admin/seed-secret-rooms/:path*',
    '/api/admin/seed-specials/:path*',
    '/api/admin/sounds/:path*',
    '/api/admin/specials/:path*',
    '/raccoon-city-rpg-data.zip',
  ],
};
