import type { Metadata } from 'next';
import Link from 'next/link';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
// import { ApiBanner } from './ApiBanner';
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

const TopBar = () => (
  <div className="topbar">
    <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
      <span>A project of DMV Throwers · DC · MD · VA</span>
      <a
        href="https://dmvthrowers.club/index.html"
        className="underline decoration-2 underline-offset-4 hover:bg-white hover:text-brand-red px-1"
      >
        ← dmvthrowers.club
      </a>
    </div>
  </div>
);

const Navigation = () => (
  <>
    <a href="#main-content" className="skip-link sr-only focus:not-sr-only">Skip to main content</a>
    <nav
      className="site-nav"
      aria-label="Main Navigation"
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
        <Link href="/" className="brand-lockup flex items-baseline gap-2">
          <span>YoYo Map</span>
          <span className="hidden sm:inline text-xs uppercase tracking-[0.22em] font-sans font-bold text-brand-red">
            by DMV Throwers
          </span>
        </Link>
        <ul className="flex items-center gap-5 flex-wrap">
          <li><Link href="/map" className="nav-link">Map</Link></li>
          <li><Link href="/submit" className="nav-link">Submit</Link></li>
          <li><Link href="/profile" className="nav-link">Profile</Link></li>
          <li>
            <a
              href="https://dmvthrowers.club/events.html"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
            >
              Events ↗
            </a>
          </li>
          <li>
            <a
              href="https://dmvthrowers.club/resources.html"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
            >
              Resources ↗
            </a>
          </li>
          <li>
            <a
              href="https://dmvthrowers.club/vsyc26.html"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link text-brand-red"
            >
              VSYC-26 ↗
            </a>
          </li>
        </ul>
      </div>
    </nav>
  </>
);

const Footer = () => (
  <footer className="bg-navy-deep text-cream/85 border-t-4 border-brand-red mt-16">
    <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-10 text-sm">
      <div>
        <p className="font-display text-2xl font-black text-white">YoYo Map</p>
        <hr className="rule-red" />
        <p className="leading-relaxed">
          A community project of <strong>DMV Throwers Yo-Yo &amp; Skill Toy Club.</strong>
          <br />All skill levels welcome.
        </p>
      </div>
      <div>
        <p className="eyebrow text-brand-red mb-3">This Site</p>
        <ul className="space-y-2">
          <li><a href="/map" className="hover:text-brand-red transition-colors">Map</a></li>
          <li><a href="/submit" className="hover:text-brand-red transition-colors">Submit</a></li>
          <li><a href="/profile" className="hover:text-brand-red transition-colors">Profile</a></li>
          <li><a href="/legal/privacy" className="hover:text-brand-red transition-colors">Privacy</a></li>
          <li><a href="/legal/terms" className="hover:text-brand-red transition-colors">Terms</a></li>
          <li><a href="https://vercel.com/kb/bulletin/vercel-april-2026-security-incident" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Security bulletin</a></li>
          <li><a href="https://github.com/dmvthrowers/yoyo-player-map" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">GitHub ↗</a></li>
        </ul>
      </div>
      <div>
        <p className="eyebrow text-brand-red mb-3">The Club</p>
        <ul className="space-y-2">
          <li><a href="https://dmvthrowers.club/index.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Home ↗</a></li>
          <li><a href="https://dmvthrowers.club/about.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">About</a></li>
          <li><a href="https://dmvthrowers.club/events.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Events</a></li>
          <li><a href="https://dmvthrowers.club/resources.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Resources</a></li>
          <li><a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">VSYC-26</a></li>
          <li><a href="https://dmvthrowers.club/contact.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Contact</a></li>
          <li><a href="https://dmvthrowers.club/code-of-conduct.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Code of Conduct</a></li>
        </ul>
      </div>
    </div>
    <div className="bg-black/30 py-4 text-center text-xs uppercase tracking-[0.18em] text-cream/70">
      © {new Date().getFullYear()} DMV Throwers · Est. 2021 · DC · MD · VA
    </div>
  </footer>
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <TopBar />
        <header className="sticky top-0 z-40">
          <Navigation />
        </header>

        {/* <ApiBanner /> */}

        <main id="main-content" className="flex-1">{children}</main>

        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
