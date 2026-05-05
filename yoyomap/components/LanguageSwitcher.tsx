
'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { routing } from '@/i18n/routing';
import React from 'react';

export default function LanguageSwitcher() {
  const locales = [
    { code: 'en', key: 'nav.languages.en' },
    { code: 'es', key: 'nav.languages.es' },
    { code: 'de', key: 'nav.languages.de' },
    { code: 'zh', key: 'nav.languages.zh' },
    { code: 'ja', key: 'nav.languages.ja' },
    { code: 'fr', key: 'nav.languages.fr' },
    { code: 'pt', key: 'nav.languages.pt' },
    { code: 'ru', key: 'nav.languages.ru' },
    { code: 'ar', key: 'nav.languages.ar' },
    { code: 'hi', key: 'nav.languages.hi' },
    { code: 'ko', key: 'nav.languages.ko' },
  ];
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = (params?.locale as string) || routing.defaultLocale;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    const validCodes = locales.map(l => l.code);
    if (code && validCodes.includes(code)) {
      router.replace(pathname, { locale: code });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-switcher" className="text-xs text-navy/60">
        {t('nav.language')}
      </label>
      <select
        id="language-switcher"
        className="text-xs border rounded px-2 py-1 bg-white text-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
        onChange={handleChange}
        value={currentLocale}
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code}>{t(l.key)}</option>
        ))}
      </select>
    </div>
  );
}
