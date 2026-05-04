import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — YoYo Map',
  description: 'Get in touch with DMV Throwers Yo-Yo & Skill Toy Club.',
  alternates: { canonical: '/contact' },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <p className="text-xs uppercase tracking-[0.3em] text-brand-red font-bold mb-2">
        {t('contact.eyebrow')}
      </p>
      <h1 className="text-4xl mb-4">{t('contact.title')}</h1>
      <p className="text-navy/80 mb-8">{t('contact.description')}</p>

      <ul className="space-y-3 text-sm">
        <li>
          <span className="font-semibold">{t('contact.emailClub')}: </span>
          <a href="mailto:contact@dmvthrowers.club" className="text-brand-red underline hover:opacity-80">
            contact@dmvthrowers.club
          </a>
        </li>
        <li>
          <span className="font-semibold">{t('contact.emailContest')}: </span>
          <a href="mailto:vastateyoyocontest@gmail.com" className="text-brand-red underline hover:opacity-80">
            vastateyoyocontest@gmail.com
          </a>
        </li>
        <li>
          <span className="font-semibold">{t('contact.instagram')}: </span>
          <a
            href="https://instagram.com/dmv_throwers"
            className="text-brand-red underline hover:opacity-80"
            target="_blank"
            rel="noopener noreferrer"
          >
            @dmv_throwers
          </a>
        </li>
        <li>
          <span className="font-semibold">{t('contact.phone')}: </span>
          <a href="tel:850-284-1613" className="text-brand-red underline hover:opacity-80">
            850-284-1613
          </a>
        </li>
        <li>
          <span className="font-semibold">{t('contact.coordinator')}: </span>
          Brandon Rogers
        </li>
      </ul>

      <div className="mt-10">
        <Link href={`/${locale}`} className="btn-ghost inline-block">
          ← {t('contact.backToHome')}
        </Link>
      </div>
    </div>
  );
}
