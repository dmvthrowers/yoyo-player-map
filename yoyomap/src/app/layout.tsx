import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  // The real <html> and <body> are in [locale]/layout.tsx for next-intl.
  // Next.js requires a root layout to exist; this satisfies it.
  return children;
}