'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ReportInner() {
  const params = useSearchParams();
  const entryId = params.get('id') || '';
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, reason, details, reporterEmail: email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit.');
      } else {
        setDone(true);
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center">
        <h1 className="text-3xl mb-4">Thanks for letting us know</h1>
        <p className="text-navy/80 mb-6">
          We review every report. The entry will be hidden immediately while we investigate if the report involves safety concerns.
        </p>
        <Link href="/map" className="btn-ghost">Back to map</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h1 className="text-3xl">Report an Entry</h1>
      <p className="text-sm text-navy/70">
        If an entry on the map is unsafe, inaccurate, or inappropriate, tell us here.
      </p>

      <div>
        <label className="label">What&apos;s wrong?</label>
        <select className="input" required value={reason} onChange={(e) => setReason(e.target.value)} title="Reason for report">
          <option value="">Select a reason…</option>
          <option value="spam">Spam or fake entry</option>
          <option value="harassment">Harassment or threatening content</option>
          <option value="impersonation">Impersonation</option>
          <option value="minor_unsafe">Unsafe content involving a minor</option>
          <option value="other">Something else</option>
        </select>
      </div>

      <div>
        <label className="label">Details (optional)</label>
        <textarea
          className="input"
          rows={4}
          maxLength={1000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="What happened? What should we know?"
        />
      </div>

      <div>
        <label className="label">Your email (optional)</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="So we can follow up"
        />
      </div>

      {error && <div className="border-2 border-brand-red bg-brand-red/10 p-3 text-sm">{error}</div>}

      <button type="submit" className="btn-primary w-full" disabled={loading || !entryId}>
        {loading ? 'Sending…' : 'Send Report'}
      </button>
      {!entryId && <p className="text-xs text-brand-red">No entry specified. Go back to the map and click a pin first.</p>}
    </form>
  );
}

export default function ReportPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <Suspense fallback={<div>Loading…</div>}>
        <ReportInner />
      </Suspense>
    </div>
  );
}
