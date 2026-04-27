/**
 * API route wrapper for multi-game database support
 * 
 * Wraps API route handlers to set the correct game DB context
 * before the handler executes.
 * 
 * Usage:
 *   export const GET = withGameDb(async (req: Request) => {
 *     const items = await db.item.findMany();
 *     return Response.json(items);
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';
import { setRequestGame, clearRequestGame } from '@/lib/game-db';

type RouteHandler = (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>;

/**
 * Extract game ID from request (cookie > header > default)
 */
export function getGameIdFromRequest(req: Request): string {
  // Try cookie
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)activeGameId=([^;]*)/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  
  // Try header
  const headerGameId = req.headers.get('x-game-id');
  if (headerGameId) return headerGameId;
  
  // Try query param (for GET requests)
  const url = new URL(req.url);
  const queryGameId = url.searchParams.get('gameId');
  if (queryGameId) return queryGameId;
  
  // Default
  return 'raccoon-city';
}

/**
 * Wrap a route handler with game DB context
 */
export function withGameDb(handler: RouteHandler): RouteHandler {
  return async (req: Request, ctx?: { params: Promise<Record<string, string>> }) => {
    const gameId = getGameIdFromRequest(req);
    setRequestGame(gameId);
    try {
      return await handler(req, ctx);
    } finally {
      clearRequestGame();
    }
  };
}

/**
 * JSON response helper with game context
 */
export function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
