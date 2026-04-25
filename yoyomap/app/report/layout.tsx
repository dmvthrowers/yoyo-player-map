import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Report an Entry',
  description: 'Report an entry on YoYo Map for review.',
  robots: { index: false, follow: false },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
