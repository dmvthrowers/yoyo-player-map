import type { Metadata } from 'next';
import Link from 'next/link';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { ApiBanner } from './ApiBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'YoYo Map — DMV Throwers',
  description: 'A privacy-first community map to help yo-yoers find each other. Opt-in, city-level only, always deletable.',
  openGraph: {
    title: 'YoYo Map',
    description: 'Find fellow yo-yoers in your area. Built by DMV Throwers.',
    type: 'website',
  },
};

const Navigation = () => (
  <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4" aria-label="Main Navigation">
    <Link href="/" className="font-display text-2xl tracking-tight">
      YoYo <span className="text-brand-red">Map</span>
    </Link>
    <ul className="flex gap-6 text-xs uppercase font-semibold tracking-wider">
      {['/map', '/submit', '/profile', '/legal/privacy'].map((href) => (
        <li key={href}>
          <Link href={href} className="hover:text-brand-red transition-colors" aria-current={href === '/profile' ? 'page' : undefined}>
            {href.replace('/', '')}
          </Link>
        </li>
      ))}
      <li>
        <a href="https://dmvthrowers.club/index.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">
          DMV Throwers
        </a>
      </li>
    </ul>
  </nav>
);

const Footer = () => (
  <footer className="bg-dark-navy text-cream/80 border-t-4 border-brand-red mt-12">
    <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6 text-sm">
      <div>
        <p className="font-display text-lg text-cream">YoYo Map</p>
        <p className="mt-2">A community project of DMV Throwers Yo-Yo &amp; Skill Toy Club. All skill levels welcome.</p>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-wider text-xs mb-2">Legal</p>
        <ul className="space-y-1">
          {['/legal/privacy', '/legal/terms'].map((href) => (
            <li key={href}>
              <Link href={href} className="hover:text-brand-red">
                {href.split('/').pop()?.replace('-', ' ')}
              </Link>
            </li>
          ))}
          <li>
            <a href="https://vercel.com/kb/bulletin/vercel-april-2026-security-incident" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">
              Security bulletin
            </a>
          </li>
        </ul>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-wider text-xs mb-2">Project</p>
        <ul className="space-y-1">
          <li>
            <a href="https://github.com/dmvthrowers/yoyo-player-map" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">
              GitHub Repo
            </a>
          </li>
          <li>
            <a href="mailto:dmvthrowers@gmail.com" className="hover:text-brand-red">
              dmvthrowers@gmail.com
            </a>
          </li>
          <li className="text-xs">DC · MD · VA</li>
        </ul>
      </div>
    </div>
    <div className="bg-navy py-3 text-center text-xs">
      <p>© {new Date().getFullYear()} DMV Throwers · EIN 41-4879324</p>
    </div>
  </footer>
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="bg-navy text-cream border-b-4 border-brand-red">
          <Navigation />
        </header>

        <ApiBanner />

        <main className="flex-1">{children}</main>

        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
