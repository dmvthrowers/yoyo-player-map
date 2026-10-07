"use client";
import { useTranslations } from 'next-intl';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiErrorMessage } from '@/lib/api-error-message';
function ProfileInner() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

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
  // Server note when the email couldn't go out right away (daily limit).
  const [sentNote, setSentNote] = useState('');
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
        setError(apiErrorMessage(data, t('profile.errorSomethingWrong')));
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.emailStatus === 'queued' || data.emailStatus === 'deferred') {
          setSentNote(data.message ?? '');
        }
        setSent(true);
      }
    } catch {
      setError(t('profile.errorNetwork'));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="card text-center">
        <h1 className="text-3xl mb-4">{t('profile.checkEmail')}</h1>
        <p className="text-navy/80">
          {sentNote || t('profile.checkEmailHelp')}
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
          <label className="label" htmlFor="pf-1">{t('profile.emailLabel')}</label>
          <input id="pf-1"
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
  entity_type: 'person' | 'shop' | 'club';
  club_meeting_info: string | null;
  club_venue_public: boolean;
  contact_name: string | null;
  address_line: string | null;
  postal_code: string | null;
  hours: string | null;
}

function ManageEntry({ token }: { token: string }) {
  const t = useTranslations();
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
          setError(apiErrorMessage(data, t('profile.errorLinkExpired')));
        } else {
          setEntry(data.entry);
        }
      } catch {
        setError(t('profile.errorNetwork'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

  async function save() {
    if (!entry) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          display_name: entry.display_name,
          city: entry.city,
          region: entry.region,
          country: entry.country,
          bio: entry.bio,
          socials: entry.socials,
          club_meeting_info: entry.club_meeting_info,
          club_venue_public: entry.club_venue_public,
          contact_name: entry.contact_name,
          address_line: entry.address_line,
          postal_code: entry.postal_code,
          hours: entry.hours,
        }),
      });
      let data: unknown = {};
      try {
        data = await res.json();
      } catch (e) {
        setError(t('profile.errorServerInvalid'));
        return;
      }
      if (!res.ok) {
        setError(apiErrorMessage(data, t('profile.errorUpdateFailed')));
      } else {
        setMessage(t('profile.saved'));
        // Reload fresh from server so the form reflects exactly what was persisted
        try {
          const refreshRes = await fetch(`/api/auth/verify-link?token=${encodeURIComponent(token)}`);
          const refreshData = await refreshRes.json();
          if (refreshRes.ok && refreshData.entry) {
            setEntry(refreshData.entry);
          }
        } catch {
          // Non-critical — form already shows edited values in local state
        }
      }
    } catch (err) {
      setError(t('profile.errorNetworkConnection'));
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
        setError(apiErrorMessage(data, t('profile.errorDeleteFailed')));
      } else {
        setEntry(null);
        setMessage(t('profile.deletedMessage'));
      }
    } catch {
      setError(t('profile.errorNetwork'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">{t('profile.loadingEntry')}</div>;
  if (error && !entry) return <div className="card text-center"><p className="text-brand-red">{error}</p></div>;
  if (!entry) return <div className="card text-center"><p>{message}</p></div>;

  return (
    <div>
      <h1 className="text-4xl mb-2">{t('profile.editEntry')}</h1>
      <p className="text-navy/80 mb-6">{t('profile.editEntryHelp')}</p>

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="pf-2">{t('profile.displayName')}</label>
          <input id="pf-2" className="input" value={entry.display_name} onChange={(e) => setEntry({ ...entry, display_name: e.target.value })} title={t('profile.displayName')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="pf-3">{t('profile.city')}</label>
            <input id="pf-3" className="input" value={entry.city} onChange={(e) => setEntry({ ...entry, city: e.target.value })} title={t('profile.city')} />
          </div>
          <div>
            <label className="label" htmlFor="pf-4">{t('profile.region')}</label>
            <input id="pf-4" className="input" value={entry.region || ''} onChange={(e) => setEntry({ ...entry, region: e.target.value })} title={t('profile.region')} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pf-5">{t('profile.bio')}</label>
          <textarea id="pf-5" className="input" rows={3} maxLength={280} value={entry.bio || ''} onChange={(e) => setEntry({ ...entry, bio: e.target.value })} title={t('profile.bio')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="pf-6">{t('profile.instagram')}</label>
            <input id="pf-6" className="input" value={entry.socials?.instagram || ''} onChange={(e) => setEntry({ ...entry, socials: { ...entry.socials, instagram: e.target.value } })} title={t('profile.instagram')} />
          </div>
          <div>
            <label className="label" htmlFor="pf-7">{t('profile.youtube')}</label>
            <input id="pf-7" className="input" value={entry.socials?.youtube || ''} onChange={(e) => setEntry({ ...entry, socials: { ...entry.socials, youtube: e.target.value } })} title={t('profile.youtube')} />
          </div>
          <div>
            <label className="label" htmlFor="pf-8">{t('profile.discord')}</label>
            <input id="pf-8" className="input" value={entry.socials?.discord || ''} onChange={(e) => setEntry({ ...entry, socials: { ...entry.socials, discord: e.target.value } })} title={t('profile.discord')} />
          </div>
          <div>
            <label className="label" htmlFor="pf-9">{t('profile.website')}</label>
            <input id="pf-9" className="input" value={entry.socials?.website || ''} onChange={(e) => setEntry({ ...entry, socials: { ...entry.socials, website: e.target.value } })} title={t('profile.website')} />
          </div>
        </div>

        {/* Shop-specific fields */}
        {entry.entity_type === 'shop' && (
          <>
            <hr className="border-navy/10" />
            <p className="font-semibold text-sm uppercase tracking-wide">🏪 {t('profile.shopDetails')}</p>
            <div>
              <label className="label" htmlFor="pf-10">{t('profile.contactName')}</label>
              <input id="pf-10" className="input" value={entry.contact_name || ''} onChange={(e) => setEntry({ ...entry, contact_name: e.target.value })} title={t('profile.contactName')} />
            </div>
            <div>
              <label className="label" htmlFor="pf-11">{t('profile.addressLine')}</label>
              <input id="pf-11" className="input" value={entry.address_line || ''} onChange={(e) => setEntry({ ...entry, address_line: e.target.value })} title={t('profile.addressLine')} />
            </div>
            <div>
              <label className="label" htmlFor="pf-12">{t('profile.postalCode')}</label>
              <input id="pf-12" className="input" value={entry.postal_code || ''} onChange={(e) => setEntry({ ...entry, postal_code: e.target.value })} title={t('profile.postalCode')} />
            </div>
            <div>
              <label className="label" htmlFor="pf-13">{t('profile.hours')}</label>
              <textarea id="pf-13" className="input" rows={3} value={entry.hours || ''} onChange={(e) => setEntry({ ...entry, hours: e.target.value })} title={t('profile.hours')} />
            </div>
          </>
        )}

        {/* Club-specific fields */}
        {entry.entity_type === 'club' && (
          <>
            <hr className="border-navy/10" />
            <p className="font-semibold text-sm uppercase tracking-wide">🎲 {t('profile.clubDetails')}</p>
            <div>
              <label className="label" htmlFor="pf-14">{t('profile.contactName')}</label>
              <input id="pf-14" className="input" value={entry.contact_name || ''} onChange={(e) => setEntry({ ...entry, contact_name: e.target.value })} title={t('profile.contactName')} />
            </div>
            <div>
              <label className="label" htmlFor="pf-15">{t('profile.meetingInfo')}</label>
              <textarea id="pf-15" className="input" rows={4} value={entry.club_meeting_info || ''} onChange={(e) => setEntry({ ...entry, club_meeting_info: e.target.value })} title={t('profile.meetingInfo')} />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={entry.club_venue_public} onChange={(e) => setEntry({ ...entry, club_venue_public: e.target.checked })} />
              {t('profile.venuePublic')}
            </label>
            {entry.club_venue_public && (
              <div className="space-y-3 pl-4 border-l-2 border-brand-red/30">
                <div>
                  <label className="label" htmlFor="pf-16">{t('profile.venueAddressLine')}</label>
                  <input id="pf-16" className="input" value={entry.address_line || ''} onChange={(e) => setEntry({ ...entry, address_line: e.target.value })} title={t('profile.venueAddressLine')} />
                </div>
                <div>
                  <label className="label" htmlFor="pf-17">{t('profile.venuePostalCode')}</label>
                  <input id="pf-17" className="input" value={entry.postal_code || ''} onChange={(e) => setEntry({ ...entry, postal_code: e.target.value })} title={t('profile.venuePostalCode')} />
                </div>
              </div>
            )}
          </>
        )}

        {message && <div className="border-2 border-green-600 bg-green-50 p-3 text-sm text-green-900">{message}</div>}
        {error && <div className="border-2 border-brand-red bg-brand-red/10 p-3 text-sm">{error}</div>}
        <button className="btn-primary w-full" disabled={saving} onClick={save}>
          {saving ? t('profile.saving') : t('profile.saveChanges')}
        </button>
      </div>

      <div className="card mt-6 border-brand-red bg-brand-red/5">
        <h2 className="text-xl mb-2">{t('profile.deleteEntry')}</h2>
        <p className="text-sm text-navy/80 mb-4">
          {t('profile.deleteEntryHelp')}
        </p>
        {!confirmDelete ? (
          <button className="btn-ghost border-brand-red text-brand-red hover:bg-brand-red hover:text-white" onClick={() => setConfirmDelete(true)}>
            {t('profile.deleteMyEntry')}
          </button>
        ) : (
          <div className="flex gap-3">
            <button className="btn-primary" disabled={saving} onClick={remove}>
              {t('profile.deleteConfirm')}
            </button>
            <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>{t('profile.cancel')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
