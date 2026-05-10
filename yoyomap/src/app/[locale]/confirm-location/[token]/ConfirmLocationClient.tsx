'use client';

import { useEffect, useState } from 'react';

type EntryPayload = {
  id: string;
  displayName: string;
  city: string;
  region: string | null;
  country: string;
  locationStatus: string;
};

type ApiErrorBody = {
  error?: {
    message?: string;
  };
};

function getErrorMessage(body: ApiErrorBody | null, fallback: string) {
  return body?.error?.message || fallback;
}

export default function ConfirmLocationClient({ token }: { token: string }) {
  const [entry, setEntry] = useState<EntryPayload | null>(null);
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/confirm-location?token=${encodeURIComponent(token)}`);
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setError(getErrorMessage(body, 'Link invalid or expired.'));
          return;
        }
        const next = body?.entry as EntryPayload;
        setEntry(next);
        setCity(next.city);
        setRegion(next.region || '');
        setCountry(next.country || '');
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function submit(mode: 'confirm' | 'update') {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/confirm-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          mode,
          city,
          region,
          country: country.toUpperCase(),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(getErrorMessage(body, 'Could not save changes.'));
        return;
      }
      setDone(true);
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="card">Loading…</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="card">
          <h1 className="text-3xl mb-3">Thanks — location confirmed</h1>
          <p className="text-navy/80">Your map location has been marked as verified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="card space-y-4">
        <h1 className="text-3xl">Confirm your city</h1>
        {entry && (
          <p className="text-sm text-navy/70">
            Entry: <strong>{entry.displayName}</strong>
          </p>
        )}

        <div>
          <label className="label">City</label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Region / State</label>
          <input
            className="input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Country (ISO-2)</label>
          <input
            className="input"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            maxLength={2}
          />
        </div>

        {error && <div className="border-2 border-brand-red bg-brand-red/10 p-3 text-sm">{error}</div>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={() => submit('confirm')}
          >
            {saving ? 'Saving…' : 'Confirm current city'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={saving}
            onClick={() => submit('update')}
          >
            Save updated city
          </button>
        </div>
      </div>
    </div>
  );
}
