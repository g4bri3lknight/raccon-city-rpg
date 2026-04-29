// global-error.tsx — Custom global error boundary
//
// Next.js 16.x tries to statically prerender /_global-error OUTSIDE the root layout.
// The default global-error uses internal Next.js contexts that return null
// during static generation, causing build failure with "useContext(...) returned null".
//
// This custom version avoids all context usage to survive static prerendering.

'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it" style={{ background: '#0a0a0f', color: '#fff' }}>
      <body style={{ margin: 0, background: '#0a0a0f', color: '#fff' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
          }}
        >
          <div
            style={{
              background: '#1a1a2e',
              borderRadius: '12px',
              padding: '3rem',
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
              border: '1px solid #333',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              ⚠️
            </div>
            <h2
              style={{
                color: '#ef4444',
                margin: '0 0 0.5rem 0',
                fontSize: '1.25rem',
              }}
            >
              Errore imprevisto
            </h2>
            <p style={{ color: '#999', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>
              {error?.message || 'Si è verificato un errore durante il caricamento.'}
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.6rem 1.5rem',
                background: '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            >
              Riprova
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
