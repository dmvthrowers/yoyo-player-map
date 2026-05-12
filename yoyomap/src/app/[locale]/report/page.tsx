'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

function ReportInner() {
  const params = useSearchParams();
  const t = useTranslations('report');
  const entryId = params?.get('id') || '';
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
        setError(data.error || t('errorFailed'));
      } else {
        setDone(true);
      }
    } catch {
      setError(t('errorNetwork'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center">
        <h1 className="text-3xl mb-4">{t('thanksTitle')}</h1>
        <p className="text-navy/80 mb-6">
          {t('thanksBody')}
        </p>
        <Link href="/map" className="btn-ghost">{t('backToMap')}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h1 className="text-3xl">{t('title')}</h1>
      <p className="text-sm text-navy/70">
        {t('subtitle')}
      </p>

      <div>
        <label className="label">{t('whatWrong')}</label>
        <select className="input" required value={reason} onChange={(e) => setReason(e.target.value)} title={t('whatWrong')}>
          <option value="">{t('selectReason')}</option>
          <option value="spam">{t('reasonSpam')}</option>
          <option value="harassment">{t('reasonHarassment')}</option>
          <option value="impersonation">{t('reasonImpersonation')}</option>
          <option value="minor_unsafe">{t('reasonMinorUnsafe')}</option>
          <option value="other">{t('reasonOther')}</option>
        </select>
      </div>

      <div>
        <label className="label">{t('details')}</label>
        <textarea
          className="input"
          rows={4}
          maxLength={1000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t('detailsPlaceholder')}
        />
      </div>

      <div>
        <label className="label">{t('yourEmail')}</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('yourEmailPlaceholder')}
        />
      </div>

      {error && <div className="border-2 border-brand-red bg-brand-red/10 p-3 text-sm">{error}</div>}

      <button type="submit" className="btn-primary w-full" disabled={loading || !entryId}>
        {loading ? t('sending') : t('send')}
      </button>
      {!entryId && <p className="text-xs text-brand-red">{t('noEntry')}</p>}
    </form>
  );
}

export default function ReportPage() {
  const t = useTranslations('report');
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Suspense fallback={<div>{t('loading')}</div>}>
        <ReportInner />
      </Suspense>
    </div>
  );
}
