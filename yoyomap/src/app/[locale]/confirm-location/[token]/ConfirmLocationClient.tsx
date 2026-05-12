'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('confirmLocation');
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
          setError(getErrorMessage(body, t('errorLinkExpired')));
          return;
        }
        const next = body?.entry as EntryPayload;
        setEntry(next);
        setCity(next.city);
        setRegion(next.region || '');
        setCountry(next.country || '');
      } catch {
        setError(t('errorNetwork'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

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
        setError(getErrorMessage(body, t('errorCouldntSave')));
        return;
      }
      setDone(true);
    } catch {
      setError(t('errorNetwork'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="card">{t('loading')}</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="card">
          <h1 className="text-3xl mb-3">{t('doneTitle')}</h1>
          <p className="text-navy/80">{t('doneBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="card space-y-4">
        <h1 className="text-3xl">{t('title')}</h1>
        {entry && (
          <p className="text-sm text-navy/70">
            {t('entry')} <strong>{entry.displayName}</strong>
          </p>
        )}

        <div>
          <label className="label">{t('city')}</label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t('regionState')}</label>
          <input
            className="input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t('countryIso')}</label>
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
            {saving ? t('saving') : t('confirmCurrent')}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={saving}
            onClick={() => submit('update')}
          >
            {t('saveUpdated')}
          </button>
        </div>
      </div>
    </div>
  );
}
