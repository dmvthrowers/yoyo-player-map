'use client';

// Fallback for errors thrown inside app/layout.tsx itself (where the regular
// error.tsx can't mount because it lives inside the layout). Must render
// <html> and <body> because the normal layout is bypassed.

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: '48px 16px', fontFamily: 'Arial, sans-serif', background: '#F5F0E8', color: '#1a1f36', textAlign: 'center' }}>
        <p style={{ fontSize: 11, letterSpacing: 2, color: '#C8102E', fontWeight: 700, textTransform: 'uppercase' }}>Critical error</p>
        <h1 style={{ fontSize: 32, margin: '12px 0 16px 0' }}>YoYo Map is offline</h1>
        <p style={{ marginBottom: 24 }}>The whole page failed to load. Refresh to try again.</p>
        <button
          onClick={reset}
          style={{ background: '#C8102E', color: '#fff', border: 0, padding: '12px 24px', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', fontSize: 13, cursor: 'pointer' }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ marginTop: 32, fontSize: 10, color: 'rgba(26,31,54,0.5)' }}>Reference: {error.digest}</p>
        )}
      </body>
    </html>
  );
}
