import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function Navigation() {
  const t = useTranslations();
  return (
    <nav className="site-nav" aria-label="Main Navigation">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
        <Link href="/" className="brand-lockup flex items-baseline gap-2">
          <span>YoYo Map</span>
          <span className="hidden sm:inline text-xs uppercase tracking-[0.22em] font-sans font-bold text-brand-red">
            by DMV Throwers
          </span>
        </Link>
        <ul className="flex items-center gap-5 flex-wrap">
          <li><Link href="/map" className="nav-link">{t('nav.map')}</Link></li>
          <li><Link href="/submit" className="nav-link">{t('nav.submit')}</Link></li>
          <li><Link href="/profile" className="nav-link">{t('nav.profile')}</Link></li>
          <li>
            <a href="https://ko-fi.com/dmvthrowers" target="_blank" rel="noopener noreferrer" className="nav-link bg-[#FF5E5B] text-white font-bold rounded px-3 py-1 hover:bg-[#FF8A8A] transition-colors shadow-sm" title="Support cool things in the yo-yo community!">
              {t('nav.donate')}
            </a>
          </li>
          <li>
            <a href="https://dmvthrowers.club/events.html" target="_blank" rel="noopener noreferrer" className="nav-link">
              {t('nav.events')} ↗
            </a>
          </li>
          <li>
            <a href="https://dmvthrowers.club/resources.html" target="_blank" rel="noopener noreferrer" className="nav-link">
              {t('nav.resources')} ↗
            </a>
          </li>
          <li>
            <a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="nav-link text-brand-red">
              {t('nav.vsyc')} ↗
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
