import { NextIntlClientProvider, useMessages } from 'next-intl';
import { notFound } from 'next/navigation';
import Navigation from '../../components/Navigation';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import './globals.css';

export default function LocaleLayout({ children, params: { locale } }: { children: React.ReactNode; params: { locale: string } }) {
  let messages;
  try {
    messages = useMessages();
  } catch (e) {
    notFound();
  }
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
          <main id="main-content" className="flex-1">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
