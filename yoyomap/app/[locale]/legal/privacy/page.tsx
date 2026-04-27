import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How YoYo Map handles your data: no tracking, city-level only, opt-in always, deletable anytime.',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyPage() {
  const t = useTranslations();
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose-styles">
      <h1 className="text-4xl mb-2">{t('legal.privacy.title')}</h1>
      <p className="text-navy/70 mb-8">{t('legal.privacy.effectiveDate')}</p>

      {[...Array(12)].map((_, i) => (
        <div key={i}>
          <h2 className="text-2xl mt-8 mb-3">{t(`legal.privacy.sections.${i}.title`)}</h2>
          {(() => {
            const body = t(`legal.privacy.sections.${i}.body`, { returnObjects: true });
            if (Array.isArray(body)) {
              return body.map((p: string, idx: number) => <p key={idx}>{p}</p>);
            }
            return <p>{body}</p>;
          })()}
          {/* Render lists if present */}
          {i === 2 && (
            <>
              <h3 className="text-lg mt-4 mb-2 font-semibold">{t('legal.privacy.sections.2.listTitle')}</h3>
              <ul className="list-disc pl-6 space-y-1"> 
                {[...Array(6)].map((_, j) => (
                  <li key={j}>{t(`legal.privacy.sections.2.list.${j}`)}</li>
                ))}
              </ul>
              <h3 className="text-lg mt-4 mb-2 font-semibold">{t('legal.privacy.sections.2.autoTitle')}</h3>
              <ul className="list-disc pl-6 space-y-1">
                {[...Array(2)].map((_, j) => (
                  <li key={j}>{t(`legal.privacy.sections.2.auto.${j}`)}</li>
                ))}
              </ul>
            </>
          )}
          {i === 3 && (
            <ul className="list-disc pl-6 space-y-1">
              {[...Array(4)].map((_, j) => (
                <li key={j}>{t(`legal.privacy.sections.3.list.${j}`)}</li>
              ))}
            </ul>
          )}
          {i === 5 && (
            <ul className="list-disc pl-6 space-y-1">
              {[...Array(4)].map((_, j) => (
                <li key={j}>{t(`legal.privacy.sections.5.list.${j}`)}</li>
              ))}
            </ul>
          )}
          {i === 7 && (
            <>
              <h3 className="text-lg mt-4 mb-2 font-semibold">{t('legal.privacy.sections.7.everyoneTitle')}</h3>
              <ul className="list-disc pl-6 space-y-1">
                {[...Array(3)].map((_, j) => (
                  <li key={j}>{t(`legal.privacy.sections.7.everyone.${j}`)}</li>
                ))}
              </ul>
              <h3 className="text-lg mt-4 mb-2 font-semibold">{t('legal.privacy.sections.7.gdprTitle')}</h3>
              <p>{t('legal.privacy.sections.7.gdprBody')}</p>
              <h3 className="text-lg mt-4 mb-2 font-semibold">{t('legal.privacy.sections.7.caTitle')}</h3>
              <p>{t('legal.privacy.sections.7.caBody')}</p>
              <h3 className="text-lg mt-4 mb-2 font-semibold">{t('legal.privacy.sections.7.vaTitle')}</h3>
              <p>{t('legal.privacy.sections.7.vaBody')}</p>
            </>
          )}
          {i === 9 && (
            <ul className="list-disc pl-6 space-y-1">
              {[...Array(4)].map((_, j) => (
                <li key={j}>{t(`legal.privacy.sections.9.list.${j}`)}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <p className="mt-4">EIN 41-4879324</p>
      <div className="mt-12 p-4 bg-navy/5 border-l-4 border-navy text-sm">
        <strong>Back to:</strong> <Link href="/" className="text-brand-red underline">Home</Link> · <Link href="/legal/terms" className="text-brand-red underline">Terms of Service</Link>
      </div>
    </div>
  );
}
