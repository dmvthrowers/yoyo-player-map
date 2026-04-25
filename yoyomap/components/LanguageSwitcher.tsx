
import { useTranslations } from 'next-intl';
import React from 'react';

export default function LanguageSwitcher() {
  const locales = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'zh', label: '中文' },
    { code: 'ja', label: '日本語' },
    { code: 'fr', label: 'Français' },
    { code: 'pt', label: 'Português' },
    { code: 'ru', label: 'Русский' },
    { code: 'ar', label: 'العربية' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'ko', label: '한국어' },
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
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
