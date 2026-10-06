import type { Metadata } from 'next';

// Token links are private to one person: keep them out of search results.
export const metadata: Metadata = {
  title: 'Confirm Your Location',
  robots: { index: false, follow: false },
};

export default function ConfirmLocationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
