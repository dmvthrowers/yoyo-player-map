import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Navigation from '../../components/Navigation';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { routing } from '../../i18n/routing';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <header className="sticky top-0 z-40">
            <Navigation />
            <div className="max-w-6xl mx-auto px-4 py-2 flex justify-end">
              <LanguageSwitcher />
            </div>
          </header>
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <footer className="bg-dark-navy text-cream/80 border-t-4 border-brand-red mt-12">
            <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-4 gap-6 text-sm">
              <div>
                <p className="font-display text-lg text-cream">YoYo Map</p>
                <p className="mt-2">A community project of DMV Throwers Yo-Yo & Skill Toy Club. All skill levels welcome.</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-xs mb-2">DMV Throwers</p>
                <ul className="space-y-1">
                  <li><a href="https://dmvthrowers.club/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Home</a></li>
                  <li><a href="https://dmvthrowers.club/events.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Events</a></li>
                  <li><a href="https://dmvthrowers.club/resources.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">Resources</a></li>
                  <li><a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">VSYC-26</a></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-xs mb-2">Legal</p>
                <ul className="space-y-1">
                  <li><a className="hover:text-brand-red" href="/legal/privacy">privacy</a></li>
                  <li><a className="hover:text-brand-red" href="/legal/terms">terms</a></li>
                </ul>
                <p className="font-semibold uppercase tracking-wider text-xs mt-4 mb-2">Security</p>
                <ul className="space-y-1">
                  <li><a className="hover:text-brand-red" href="/docs/SECURITY-INCIDENT-APRIL-2026.md" target="_blank" rel="noopener noreferrer">Security Bulletin: April 2026</a></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-xs mb-2">Project</p>
                <ul className="space-y-1">
                  <li><a href="https://github.com/dmvthrowers/yoyo-player-map" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">GitHub Repo</a></li>
                  <li><a href="mailto:dmvthrowers@gmail.com" className="hover:text-brand-red">dmvthrowers@gmail.com</a></li>
                  <li className="text-xs">DC · MD · VA</li>
                </ul>
              </div>
            </div>
            <div className="bg-navy py-3 text-center text-xs">
              <p>© 2026 DMV Throwers · EIN 41-4879324</p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
