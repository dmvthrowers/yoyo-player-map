import { redirect } from 'next/navigation';

export default function RootPage() {
  // Middleware handles this 99% of the time.
  // This runs only if the edge middleware is bypassed.
  redirect('/en');
}