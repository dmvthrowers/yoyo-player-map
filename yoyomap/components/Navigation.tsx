
"use client";
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navigation() {
  const t = useTranslations();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <nav className="site-nav" aria-label="Main Navigation">
      {/* Single-row bar: logo on left, desktop links in middle-right, hamburger on mobile */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="brand-lockup flex items-baseline gap-2" onClick={close}>
          <span>YoYo Map</span>
          <span className="hidden sm:inline text-xs uppercase tracking-[0.22em] font-sans font-bold text-brand-red">
            by DMV Throwers
          </span>
        </Link>

        {/* Desktop nav — hidden below md breakpoint */}
        <div className="hidden md:flex items-center gap-6">
          <ul className="flex items-center gap-5">
            <li><Link href="/map" className="nav-link">{t('nav.map')}</Link></li>
            <li><Link href="/players" className="nav-link">Players</Link></li>
            <li><Link href="/submit" className="nav-link">{t('nav.submit')}</Link></li>
            <li><Link href="/profile" className="nav-link">{t('nav.profile')}</Link></li>
            <li>
              <a
                href="https://ko-fi.com/dmvthrowers"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link bg-[#FF5E5B] text-white font-bold rounded px-3 py-1 hover:bg-[#FF8A8A] transition-colors shadow-sm"
                title="Support cool things in the yo-yo community!"
              >
                {t('nav.donate')}
              </a>
            </li>
            <li>
              <a href="https://dmvthrowers.club/" target="_blank" rel="noopener noreferrer" className="nav-link">
                DMV Throwers ↗
              </a>
            </li>
            <li>
              <a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="nav-link text-brand-red">
                {t('nav.vsyc')} ↗
              </a>
            </li>
          </ul>
          <LanguageSwitcher />
        </div>

        {/* Hamburger button — visible only on mobile */}
        <button
          className="md:hidden p-2 -mr-1 text-navy-deep"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
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

      {/* Mobile dropdown — only rendered when open, hidden on desktop via md:hidden */}
      {menuOpen && (
        <div id="mobile-menu" className="md:hidden border-t bg-cream px-4 pb-4 pt-2">
          <ul className="flex flex-col">
            <li><Link href="/map" className="nav-link block py-2" onClick={close}>{t('nav.map')}</Link></li>
            <li><Link href="/players" className="nav-link block py-2" onClick={close}>Players</Link></li>
            <li><Link href="/submit" className="nav-link block py-2" onClick={close}>{t('nav.submit')}</Link></li>
            <li><Link href="/profile" className="nav-link block py-2" onClick={close}>{t('nav.profile')}</Link></li>
            <li>
              <a
                href="https://ko-fi.com/dmvthrowers"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link block py-2"
                onClick={close}
              >
                {t('nav.donate')}
              </a>
            </li>
            <li>
              <a href="https://dmvthrowers.club/" target="_blank" rel="noopener noreferrer" className="nav-link block py-2" onClick={close}>
                DMV Throwers ↗
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
      )}
    </nav>
  );
}
