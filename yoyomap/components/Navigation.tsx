
"use client";
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations();
  const pathname = usePathname();
  const close = () => setMenuOpen(false);

  function navCls(path: string, extra = '') {
    const active = pathname === path || pathname.startsWith(path + '/');
    return `nav-link whitespace-nowrap${active ? ' border-brand-red text-brand-red' : ''}${extra ? ' ' + extra : ''}`;
  }

  return (
    <>
      {/* Utility topbar — desktop only. Holds external links + language switcher. */}
      <div className="topbar hidden md:block">
        <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-end gap-5">
          <a
            href="https://dmvthrowers.club/"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-link"
          >
            {t('nav.dmvThrowers')} ↗
          </a>
          <a
            href="https://dmvthrowers.club/vsyc26.html"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-link"
          >
            {t('nav.vsyc')} ↗
          </a>
          <a
            href="https://yoyoarchive.org/yya-events"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-link"
          >
            {t('nav.clubEvents')} ↗
          </a>
          <div className="pl-3 border-l border-white/30">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <nav className="site-nav" aria-label="Main Navigation">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
          <Link href="/" className="brand-lockup whitespace-nowrap" onClick={close}>
            {t('nav.brand')}
          </Link>

          {/* Desktop nav — hidden below md breakpoint */}
          <div className="hidden md:flex items-center gap-6">
            <ul className="flex items-center gap-6">
              <li><Link href="/map" className={navCls('/map')}>{t('nav.map')}</Link></li>
              <li><Link href="/players" className={navCls('/players')}>{t('nav.players')}</Link></li>
              <li><Link href="/submit" className={navCls('/submit')}>{t('nav.submit')}</Link></li>
              <li><Link href="/profile" className={navCls('/profile')}>{t('nav.profile')}</Link></li>
              <li>
                <a
                  href="https://ko-fi.com/dmvthrowers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="donate-btn"
                  title={t('nav.donateTitle')}
                >
                  {t('nav.donate')}
                </a>
              </li>
            </ul>
          </div>

          {/* Hamburger button — visible only on mobile */}
          <button
            type="button"
            className="md:hidden p-2 -mr-1 text-navy-deep"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
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

        {/* Mobile dropdown — always rendered for aria-controls */}
        <div id="mobile-menu" className={`md:hidden border-t bg-cream px-4 pb-4 pt-2${menuOpen ? '' : ' hidden'}`}>
            <ul className="flex flex-col">
              <li><Link href="/map" className={navCls('/map', 'block py-2')} onClick={close}>{t('nav.map')}</Link></li>
              <li><Link href="/players" className={navCls('/players', 'block py-2')} onClick={close}>{t('nav.players')}</Link></li>
              <li><Link href="/submit" className={navCls('/submit', 'block py-2')} onClick={close}>{t('nav.submit')}</Link></li>
              <li><Link href="/profile" className={navCls('/profile', 'block py-2')} onClick={close}>{t('nav.profile')}</Link></li>
              <li className="py-2">
                <a
                  href="https://ko-fi.com/dmvthrowers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="donate-btn inline-block"
                  onClick={close}
                >
                  {t('nav.donate')}
                </a>
              </li>
              <li>
                <a href="https://yoyoarchive.org/yya-events" target="_blank" rel="noopener noreferrer" className="nav-link block py-2" onClick={close}>
                  {t('nav.clubEvents')} ↗
                </a>
              </li>
              <li>
                <a href="https://dmvthrowers.club/" target="_blank" rel="noopener noreferrer" className="nav-link block py-2" onClick={close}>
                  {t('nav.dmvThrowers')} ↗
                </a>
              </li>
              <li>
                <a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="nav-link text-brand-red block py-2" onClick={close}>
                  {t('nav.vsyc')} ↗
                </a>
              </li>
            </ul>
            <div className="mt-3 pt-3 border-t border-hairline">
              <LanguageSwitcher />
            </div>
          </div>
      </nav>
    </>
  );
}
