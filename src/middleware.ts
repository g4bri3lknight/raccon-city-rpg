import { NextRequest, NextResponse } from 'next/server';

const ADMIN_KEY = process.env.ADMIN_KEY || 'raccoon_admin_2024';

export function middleware(request: NextRequest) {
  // Only protect admin API routes
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    const providedKey =
      request.headers.get('x-admin-key') ||
      request.nextUrl.searchParams.get('admin_key');

    if (providedKey !== ADMIN_KEY) {
      return NextResponse.json(
        { error: 'Non autorizzato. Fornisci l\'header x-admin-key o il parametro admin_key.' },
        { status: 401 }
      );
    }
  }

  // Block direct access to the export ZIP file in public/
  if (request.nextUrl.pathname === '/raccoon-city-rpg-data.zip') {
    return NextResponse.json({ error: 'Accesso diretto non consentito' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/raccoon-city-rpg-data.zip'],
};
