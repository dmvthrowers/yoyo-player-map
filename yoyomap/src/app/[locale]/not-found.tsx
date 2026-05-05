import { Link } from '@/i18n/navigation';

// Rendered whenever notFound() is called or a route doesn't match.
// Reached naturally from /profile and /report when token/id lookups fail.

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-[11px] uppercase tracking-widest text-brand-red font-bold mb-2">404</p>
      <h1 className="font-display text-4xl text-navy mb-4">Nothing here</h1>
      <p className="text-navy/80 mb-8">
        That page doesn&apos;t exist — or the link you followed expired. Try the map, or head home.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/map" className="btn-primary">Open map</Link>
        <Link href="/" className="btn-secondary">Home</Link>
      </div>
    </div>
  );
}
