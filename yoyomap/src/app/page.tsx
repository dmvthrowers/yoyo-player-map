import { redirect } from 'next/navigation';

export default function RootPage() {
  // Middleware should redirect / → /en/ first.
  // This is a safety net if middleware is skipped.
  redirect('/en');
}