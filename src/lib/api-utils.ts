/**
 * API utility functions for secure error handling.
 *
 * All API routes should use `safeErrorResponse()` for 500 errors
 * to prevent leaking internal details (Prisma messages, stack traces, etc.)
 * to the client.
 */

/**
 * Returns a generic 500 response. Logs the real error server-side
 * but sends only a non-descriptive message to the client.
 *
 * @param error   The caught error (logged to console, never sent to client)
 * @param label   Optional label for the console log (e.g. "[Admin Items]")
 */
export function safeErrorResponse(error: unknown, label?: string): Response {
  // Log full error server-side for debugging
  if (label) {
    console.error(`${label}`, error);
  } else {
    console.error(error);
  }

  // Return generic message to client — never expose internals
  return new Response(
    JSON.stringify({ error: 'Errore interno del server' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
