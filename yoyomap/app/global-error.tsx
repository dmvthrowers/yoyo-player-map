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
      <body className="global-error-body">
        <p className="global-error-critical">Critical error</p>
        <h1 className="global-error-title">YoYo Map is offline</h1>
        <p className="global-error-desc">The whole page failed to load. Refresh to try again.</p>
        <button
          onClick={reset}
          className="global-error-btn"
        >
          Try again
        </button>
        {error.digest && (
          <p className="global-error-ref">Reference: {error.digest}</p>
        )}
      </body>
    </html>
  );
}
