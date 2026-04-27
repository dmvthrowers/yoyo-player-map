
'use client';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ProfileInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (token) {
    return <ManageEntry token={token} />;
  }
  return <RequestMagicLink />;
}

export default function ProfilePage() {
  const t = useTranslations();
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-display text-brand-red mb-4">{t('profile.title')}</h1>
      <p className="text-navy/80">{t('profile.description')}</p>
      <Suspense fallback={<div>{t('profile.loading')}</div>}>
        <ProfileInner />
      </Suspense>
    </div>
  );
}

function RequestMagicLink() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="card text-center">
        <h1 className="text-3xl mb-4">{t('profile.checkEmail')}</h1>
        <p className="text-navy/80">
          {t('profile.checkEmailHelp')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl mb-2">{t('profile.manageEntry')}</h1>
      <p className="text-navy/80 mb-6">
        {t('profile.manageEntryHelp')}
      </p>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label">{t('profile.emailLabel')}</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            title={t('profile.emailTitle')}
          />
        </div>
        {error && <div className="border-2 border-brand-red bg-brand-red/10 p-3 text-sm">{error}</div>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? t('profile.sending') : t('profile.sendMagicLink')}
        </button>
      </form>
    </div>
  );
}

interface EntryData {
  id: string;
  display_name: string;
  city: string;
  region: string | null;
  country: string;
  bio: string | null;
  socials: Record<string, string>;
  is_visible: boolean;
}

function ManageEntry({ token }: { token: string }) {
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/auth/verify-link?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Link invalid or expired.');
        } else {
          setEntry(data.entry);
        }
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function save() {
    if (!entry) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...entry }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Update failed.');
      } else {
        setMessage('Saved.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!entry) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Delete failed.');
      } else {
        setEntry(null);
        setMessage('Your entry has been permanently deleted.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">Loading your entry…</div>;
  if (error && !entry) return <div className="card text-center"><p className="text-brand-red">{error}</p></div>;
  if (!entry) return <div className="card text-center"><p>{message}</p></div>;

  return (
    <div>
      <h1 className="text-4xl mb-2">Edit Your Entry</h1>
      <p className="text-navy/80 mb-6">Changes save when you click the button below.</p>

      <div className="card space-y-4">
        <div>
          <label className="label">Display name</label>
          <input className="input" value={entry.display_name} onChange={(e) => setEntry({ ...entry, display_name: e.target.value })} title="Display name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">City</label>
            <input className="input" value={entry.city} onChange={(e) => setEntry({ ...entry, city: e.target.value })} title="City" />
          </div>
          <div>
            <label className="label">Region</label>
            <input className="input" value={entry.region || ''} onChange={(e) => setEntry({ ...entry, region: e.target.value })} title="Region" />
          </div>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea className="input" rows={3} maxLength={280} value={entry.bio || ''} onChange={(e) => setEntry({ ...entry, bio: e.target.value })} title="Bio" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Instagram</label>
            <input className="input" value={entry.socials?.instagram || ''} onChange={(e) => setEntry({ ...entry, socials: { ...entry.socials, instagram: e.target.value } })} title="Instagram" />
          </div>
          <div>
            <label className="label">YouTube</label>
            <input className="input" value={entry.socials?.youtube || ''} onChange={(e) => setEntry({ ...entry, socials: { ...entry.socials, youtube: e.target.value } })} title="YouTube" />
          </div>
          <div>
            <label className="label">Discord</label>
            <input className="input" value={entry.socials?.discord || ''} onChange={(e) => setEntry({ ...entry, socials: { ...entry.socials, discord: e.target.value } })} title="Discord" />
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input" value={entry.socials?.website || ''} onChange={(e) => setEntry({ ...entry, socials: { ...entry.socials, website: e.target.value } })} title="Website" />
          </div>
        </div>
        {message && <div className="border-2 border-green-600 bg-green-50 p-3 text-sm text-green-900">{message}</div>}
        {error && <div className="border-2 border-brand-red bg-brand-red/10 p-3 text-sm">{error}</div>}
        <button className="btn-primary w-full" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="card mt-6 border-brand-red bg-brand-red/5">
        <h2 className="text-xl mb-2">Delete your entry</h2>
        <p className="text-sm text-navy/80 mb-4">
          Permanently remove your entry. This cannot be undone. Your email and any consent records are also deleted.
        </p>
        {!confirmDelete ? (
          <button className="btn-ghost border-brand-red text-brand-red hover:bg-brand-red hover:text-white" onClick={() => setConfirmDelete(true)}>
            Delete My Entry
          </button>
        ) : (
          <div className="flex gap-3">
            <button className="btn-primary" disabled={saving} onClick={remove}>
              Yes, delete permanently
            </button>
            <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
