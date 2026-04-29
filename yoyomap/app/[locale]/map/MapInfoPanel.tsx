'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  counts: { person: number; shop: number; club: number };
}

export default function MapInfoPanel({ counts }: Props) {
  const [open, setOpen] = useState(true);
  const t = useTranslations();

  useEffect(() => {
    if (window.innerWidth < 768) setOpen(false);
  }, []);

  const summary = [
    t('map.countThrowers', { count: counts.person }),
    counts.shop > 0 ? t('map.countShops', { count: counts.shop }) : null,
    counts.club > 0 ? t('map.countClubs', { count: counts.club }) : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="absolute top-4 left-4 z-[500] bg-cream border-2 border-navy shadow-lg max-w-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left"
        aria-expanded={open ? 'true' : 'false'}
        aria-label={open ? t('map.collapseInfoPanel') : t('map.expandInfoPanel')}
      >
        <span className="font-display text-base leading-none whitespace-nowrap">{t('map.title')}</span>
        <span className="text-[10px] text-navy/60 flex-1 truncate">{summary}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`flex-shrink-0 text-navy/50 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-navy/10">
          <p className="text-[10px] text-navy/60 my-2">
            {t('map.infoPanelDescription')}
          </p>
          <a href="/submit" className="btn-primary text-xs py-2 px-3 w-full text-center block">
            {t('map.addToMap')}
          </a>
        </div>
      )}
    </div>
  );
}
