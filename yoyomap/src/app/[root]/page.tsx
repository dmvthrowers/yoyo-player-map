import { redirect } from 'next/navigation';

export default function RootPage() {
  // Middleware redirects / → /en/ in normal operation.
  // This page runs only if the edge middleware is bypassed.
  redirect('/en');
}