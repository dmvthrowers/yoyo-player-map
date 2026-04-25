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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
