import type { Metadata } from 'next';
import { localeAlternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
  title: 'Add Yourself to the Yo-Yo Map',
  description: 'Add yourself, your shop, or your yo-yo club to the community map. Opt-in, city-level only, takes about a minute.',
  alternates: localeAlternates(locale, '/submit'),
  openGraph: {
    title: 'Add Yourself to the Yo-Yo Map',
    description: 'Join the global community of yo-yo players. Opt-in, privacy-first.',
    url: '/submit',
  },
  };
}

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
