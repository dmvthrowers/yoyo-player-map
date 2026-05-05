import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import Navigation from '@/components/Navigation';
import { routing } from '@/i18n/routing';
import '../../globals.css';

export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ localized: locale, locale }));
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  // Use translations in the footer
  const t = await getTranslations();

  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <header className="sticky top-0 z-40">
            <Navigation />
          </header>
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <footer className="bg-dark-navy text-cream/80 border-t-4 border-brand-red mt-12">
            <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-4 gap-6 text-sm">
              <div>
                <p className="font-display text-lg text-cream">{t('footer.title')}</p>
                <p className="mt-2">{t('footer.description')}</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-xs mb-2">{t('footer.dmvThrowers')}</p>
                <ul className="space-y-1">
                  <li><a href="https://dmvthrowers.club/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">{t('footer.home')}</a></li>
                  <li><a href="https://dmvthrowers.club/vsyc26.html" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">{t('footer.vsyc')}</a></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-xs mb-2">{t('footer.legal')}</p>
                <ul className="space-y-1">
                  <li><Link className="hover:text-brand-red" href="/legal/privacy">{t('footer.privacy')}</Link></li>
                  <li><Link className="hover:text-brand-red" href="/legal/terms">{t('footer.terms')}</Link></li>
                </ul>
                <p className="font-semibold uppercase tracking-wider text-xs mt-4 mb-2">{t('footer.security')}</p>
                <ul className="space-y-1">
                  <li><Link className="hover:text-brand-red" href="/legal/security">{t('footer.securityBulletin')}</Link></li>
                  <li><Link className="hover:text-brand-red" href="/status">{t('footer.serviceStatus')}</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-xs mb-2">{t('footer.project')}</p>
                <ul className="space-y-1">
                  <li><a href="https://github.com/dmvthrowers/yoyo-player-map" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red">{t('footer.github')}</a></li>
                  <li><Link className="hover:text-brand-red" href="/contact">{t('footer.contact')}</Link></li>
                  <li className="text-xs">DC · MD · VA</li>
                </ul>
              </div>
            </div>
            <div className="bg-navy py-3 text-center text-xs">
              <p>{t('footer.copyright')}</p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
