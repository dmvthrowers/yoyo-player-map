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
  <>
    <a href="#main-content" className="skip-link sr-only focus:not-sr-only">Skip to main content</a>
    <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4" aria-label="Main Navigation">
      <Link href="/" className="font-display text-2xl tracking-tight">
        YoYo <span className="text-brand-red">Map</span>
      </Link>
      <ul className="flex gap-4 text-xs uppercase font-semibold tracking-wider flex-wrap">
        <li><Link href="/map" className="hover:text-brand-red transition-colors">Map</Link></li>
        <li><Link href="/submit" className="hover:text-brand-red transition-colors">Submit</Link></li>
        <li><Link href="/profile" className="hover:text-brand-red transition-colors">Profile</Link></li>
        <li><Link href="/legal/privacy" className="hover:text-brand-red transition-colors">Privacy</Link></li>
        <li><Link href="/legal/terms" className="hover:text-brand-red transition-colors">Terms</Link></li>
        <li><a href="https://dmvthrowers.club/about.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">About</a></li>
        <li><a href="https://dmvthrowers.club/team.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Team</a></li>
        <li><a href="https://dmvthrowers.club/events.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Events</a></li>
        <li><a href="https://dmvthrowers.club/gallery.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Gallery</a></li>
        <li><a href="https://dmvthrowers.club/resources.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Resources</a></li>
        <li><a href="https://dmvthrowers.club/faq.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">FAQ</a></li>
        <li><a href="https://dmvthrowers.club/contact.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Contact</a></li>
        <li><a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">VSYC-26</a></li>
        <li><a href="https://dmvthrowers.club/code-of-conduct.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Code of Conduct</a></li>
        <li><a href="https://github.com/dmvthrowers" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Club GitHub</a></li>
      </ul>
    </nav>
  </>
);

const Footer = () => (
  <footer className="bg-dark-navy text-cream/80 border-t-4 border-brand-red mt-12">
    <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6 text-sm">
      <div>
        <p className="font-display text-lg text-cream">YoYo Map</p>
        <p className="mt-2">A community project of DMV Throwers Yo-Yo &amp; Skill Toy Club. All skill levels welcome.</p>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-wider text-xs mb-2">Links</p>
        <ul className="space-y-1">
          <li><a href="/map" className="hover:text-brand-red">Map</a></li>
          <li><a href="/submit" className="hover:text-brand-red">Submit</a></li>
          <li><a href="/profile" className="hover:text-brand-red">Profile</a></li>
          <li><a href="/legal/privacy" className="hover:text-brand-red">Privacy</a></li>
          <li><a href="/legal/terms" className="hover:text-brand-red">Terms</a></li>
          <li><a href="https://vercel.com/kb/bulletin/vercel-april-2026-security-incident" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Security bulletin</a></li>
          <li><a href="https://github.com/dmvthrowers/yoyo-player-map" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">GitHub Repo</a></li>
        </ul>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-wider text-xs mb-2">Club</p>
        <ul className="space-y-1">
          <li><a href="https://dmvthrowers.club/about.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">About</a></li>
          <li><a href="https://dmvthrowers.club/team.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Team</a></li>
          <li><a href="https://dmvthrowers.club/events.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Events</a></li>
          <li><a href="https://dmvthrowers.club/gallery.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Gallery</a></li>
          <li><a href="https://dmvthrowers.club/resources.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Resources</a></li>
          <li><a href="https://dmvthrowers.club/faq.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">FAQ</a></li>
          <li><a href="https://dmvthrowers.club/contact.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Contact</a></li>
          <li><a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">VSYC-26</a></li>
          <li><a href="https://dmvthrowers.club/code-of-conduct.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Code of Conduct</a></li>
          <li><a href="https://github.com/dmvthrowers" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Club GitHub</a></li>
        </ul>
      </div>
    </div>
    <div className="bg-navy py-3 text-center text-xs">
      <p>© {new Date().getFullYear()} DMV Throwers · Est. 2021 · DC · MD · VA</p>
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

        <main id="main-content" className="flex-1">{children}</main>

        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
