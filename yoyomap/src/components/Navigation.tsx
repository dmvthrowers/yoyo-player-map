'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const t = useTranslations('nav');
  const pathname = usePathname();
  const locale = useLocale();
  const close = () => setMenuOpen(false);

  function navCls(path: string) {
    return `nav-link whitespace-nowrap${pathname === path ? ' border-brand-red text-brand-red' : ''}`;
  }

  return (
    <>
      <div className="topbar hidden md:block">
        <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-end gap-5">
          <a
            href="https://dmvthrowers.club/"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-link"
          >
            {t('dmvThrowers')} ↗
          </a>
          <a
            href="https://dmvthrowers.club/vsyc26.html"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-link"
          >
            {t('vsyc')} ↗
          </a>
        </div>
      </div>

      <nav className="site-nav" aria-label="Main Navigation">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
          <Link href="/" className="brand-lockup whitespace-nowrap" onClick={close}>
            YoYo <span className="text-brand-red">Map</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <ul className="flex items-center gap-6">
              <li><Link href="/map" className={navCls('/map')}>{t('map')}</Link></li>
              <li><Link href="/players" className={navCls('/players')}>{t('players')}</Link></li>
              <li><Link href="/submit" className={navCls('/submit')}>{t('submit')}</Link></li>
              <li><Link href="/profile" className={navCls('/profile')}>{t('profile')}</Link></li>
              <li>
                <a
                  href="https://ko-fi.com/dmvthrowers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="donate-btn"
                  title={t('donateTitle')}
                >
                  {t('donate')}
                </a>
              </li>
            </ul>
            {/* Language switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((o) => !o)}
                aria-expanded={langOpen}
                aria-label={t('languageSelect')}
                className="nav-link text-xs flex items-center gap-1"
              >
                <span aria-hidden="true">🌐</span>
                <span className="uppercase">{locale}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 bg-cream border-2 border-navy shadow-lg z-50 min-w-[130px]">
                  <ul className="py-1">
                    {routing.locales.map((l) => (
                      <li key={l}>
                        <Link
                          href={pathname}
                          locale={l}
                          className={`block px-3 py-1.5 text-sm hover:bg-navy/10 ${l === locale ? 'font-bold text-brand-red' : ''}`}
                          onClick={() => setLangOpen(false)}
                        >
                          {t(`languages.${l}`)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="md:hidden p-2 -mr-1 text-navy-deep"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        <div id="mobile-menu" className={`md:hidden border-t bg-cream px-4 pb-4 pt-2${menuOpen ? '' : ' hidden'}`}>
          <ul className="flex flex-col">
            <li><Link href="/map" className="nav-link block py-2" onClick={close}>{t('map')}</Link></li>
            <li><Link href="/players" className="nav-link block py-2" onClick={close}>{t('players')}</Link></li>
            <li><Link href="/submit" className="nav-link block py-2" onClick={close}>{t('submit')}</Link></li>
            <li><Link href="/profile" className="nav-link block py-2" onClick={close}>{t('profile')}</Link></li>
            <li className="py-2">
              <a href="https://ko-fi.com/dmvthrowers" target="_blank" rel="noopener noreferrer" className="donate-btn inline-block" onClick={close}>{t('donate')}</a>
            </li>
            <li>
              <a href="https://dmvthrowers.club/" target="_blank" rel="noopener noreferrer" className="nav-link block py-2" onClick={close}>{t('dmvThrowers')} ↗</a>
            </li>
            <li>
              <a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="nav-link text-brand-red block py-2" onClick={close}>{t('vsyc')} ↗</a>
            </li>
            <li className="pt-2 border-t border-navy/10 mt-2">
              <p className="text-xs text-navy/60 mb-1">{t('language')}</p>
              <div className="flex flex-wrap gap-2">
                {routing.locales.map((l) => (
                  <Link
                    key={l}
                    href={pathname}
                    locale={l}
                    className={`text-xs px-2 py-1 border ${l === locale ? 'border-brand-red text-brand-red font-bold' : 'border-navy/30 text-navy/70'}`}
                    onClick={close}
                  >
                    {t(`languages.${l}`)}
                  </Link>
                ))}
              </div>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
