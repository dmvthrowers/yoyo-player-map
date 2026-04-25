import { useTranslations } from 'next-intl';

export default function LanguageSwitcher() {
  // This is a simple language switcher for demonstration
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
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs text-navy/60">{t('nav.language', { defaultValue: 'Language:' })}</span>
      {locales.map((l) => (
        <a key={l.code} href={`/${l.code}`} className="underline text-brand-red text-xs hover:text-brand-red/80">
          {l.label}
        </a>
      ))}
    </div>
  );
}
