'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useMediaQuery } from '@/lib/use-media-query';

interface Props {
  counts: { person: number; shop: number; club: number };
}

export default function MapInfoPanel({ counts }: Props) {
  // Collapsed by default on phones, open on wider screens, until the person toggles it.
  const isNarrow = useMediaQuery('(max-width: 767px)');
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? !isNarrow;
  const t = useTranslations();


  const summary = [
    t('map.countThrowers', { count: counts.person }),
    counts.shop > 0 ? t('map.countShops', { count: counts.shop }) : null,
    counts.club > 0 ? t('map.countClubs', { count: counts.club }) : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="absolute top-4 left-4 z-500 bg-cream border-2 border-navy max-w-xs">
      <button
        onClick={() => setUserOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left"
        aria-expanded={open}
        aria-controls="map-info-panel"
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
          className={`shrink-0 text-navy/50 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div id="map-info-panel" className={`px-3 pb-3 border-t border-navy/10${open ? '' : ' hidden'}`}>
          <p className="text-[10px] text-navy/60 my-2">
            {t('map.infoPanelDescription')}
          </p>
          <Link href="/submit" className="btn-primary text-xs py-2 px-3 w-full text-center block">
            {t('map.addToMap')}
          </Link>
        </div>
    </div>
  );
}
