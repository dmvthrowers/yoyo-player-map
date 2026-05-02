
import { useTranslations } from 'next-intl';
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
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    if (code) {
      window.location.href = `/${code}`;
    }
  }
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-switcher" className="text-xs text-navy/60">
        {t('nav.language', { defaultValue: 'Language:' })}
      </label>
      <select
        id="language-switcher"
        className="text-xs border rounded px-2 py-1 bg-white text-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red"
        onChange={handleChange}
        defaultValue={''}
      >
        <option value="" disabled>{t('nav.languageSelect', { defaultValue: 'Select language' })}</option>
        {locales.map((l) => (
          <option key={l.code} value={l.code}>{t(l.key)}</option>
        ))}
      </select>
    </div>
  );
}
