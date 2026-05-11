'use client';

// Next.js app-router error boundary. Catches uncaught errors thrown in any
// route segment below app/layout.tsx (except the layout itself — see
// global-error.tsx for that). Server errors and client errors both land here.

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  useEffect(() => {
    // Vercel captures console.error into function logs; digest correlates
    // back to the server-rendered request.
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-[11px] uppercase tracking-widest text-brand-red font-bold mb-2">{t('eyebrow')}</p>
      <h1 className="font-display text-4xl text-navy mb-4">{t('title')}</h1>
      <p className="text-navy/80 mb-8">{t('description')}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={reset} className="btn-primary">{t('tryAgain')}</button>
        <Link href="/map" className="btn-secondary">{t('backToMap')}</Link>
      </div>
      {error.digest && (
        <p className="mt-8 text-[10px] text-navy/40">{t('reference', { digest: error.digest })}</p>
      )}
    </div>
  );
}
