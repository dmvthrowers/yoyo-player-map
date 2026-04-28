import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for YoYo Map, a community project of DMV Throwers.',
  alternates: { canonical: '/legal/terms' },
};

export default function TermsPage() {
  const t = useTranslations();
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl mb-2">{t('legal.terms.title')}</h1>
      <p className="text-navy/70 mb-8">{t('legal.terms.effectiveDate')}</p>

      {[...Array(14)].map((_, i) => (
        <div key={i}>
          <h2 className="text-2xl mt-8 mb-3">{t(`legal.terms.sections.${i}.title`)}</h2>
          {Array.isArray(t(`legal.terms.sections.${i}.body`, { returnObjects: true })) ? (
            t(`legal.terms.sections.${i}.body`, { returnObjects: true }).map((p: string, idx: number) => (
              <p key={idx}>{p}</p>
            ))
          ) : (
            <p>{t(`legal.terms.sections.${i}.body`)}</p>
          )}
          {i === 2 && (
            <ul className="list-disc pl-6 space-y-1">
              {[...Array(6)].map((_, j) => (
                <li key={j}>{t(`legal.terms.sections.2.list.${j}`)}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <div className="mt-12 p-4 bg-navy/5 border-l-4 border-navy text-sm">
        <strong>{t('legal.terms.backTo')}</strong>{' '}
        <Link href="/" className="text-brand-red underline">{t('legal.terms.home')}</Link> ·{' '}
        <Link href="/legal/privacy" className="text-brand-red underline">{t('legal.terms.privacy')}</Link>
      </div>
    </div>
  );
}
