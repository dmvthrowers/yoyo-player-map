'use client';

// Next.js app-router error boundary. Catches uncaught errors thrown in any
// route segment below app/layout.tsx (except the layout itself — see
// global-error.tsx for that). Server errors and client errors both land here.

"use client";

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vercel captures console.error into function logs; digest correlates
    // back to the server-rendered request.
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-[11px] uppercase tracking-widest text-brand-red font-bold mb-2">Something broke</p>
      <h1 className="font-display text-4xl text-navy mb-4">We hit a snag</h1>
      <p className="text-navy/80 mb-8">
        This page failed to load. The error&apos;s been logged — try again, or head back to the map.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/map" className="btn-secondary">Back to map</Link>
      </div>
      {error.digest && (
        <p className="mt-8 text-[10px] text-navy/40">Reference: {error.digest}</p>
      )}
    </div>
  );
}
