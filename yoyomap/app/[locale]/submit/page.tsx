
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { SubmitInput } from '@/lib/validation';

// Utility hooks to fetch countries, regions, and all cities for autocomplete

function useCountries() {
  const [countries, setCountries] = useState<{ id: number; code: string; name: string }[]>([]);
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/locations?type=countries');
      const data = await res.json();
      setCountries(data.countries || []);
    })();
  }, []);
  return countries;
}

function useRegions(countryId: number | null) {
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    if (!countryId) {
      setRegions([]);
      return;
    }
    (async () => {
      const res = await fetch(`/api/locations?type=regions&country_id=${countryId}`);
      const data = await res.json();
      setRegions(data.regions || []);
    })();
  }, [countryId]);
  return regions;
}

// Minimal stub for CityAutocomplete
function CityAutocomplete({ countryId, regionId, cityId, setCityId }: {
  countryId: number | null;
  regionId: number | null;
  cityId: number | null;
  setCityId: (id: number | null) => void;
}) {
  // This should be replaced with a real autocomplete component
  return (
    <input
      id="city_autocomplete"
      className="input"
      value={cityId ?? ''}
      onChange={e => setCityId(Number(e.target.value) || null)}
      placeholder="City ID (stub)"
    />
  );
}


function SubmitToast({ onClose }: { onClose: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setFading(true), 5000);
    const close = setTimeout(onClose, 6000);
    return () => { clearTimeout(fade); clearTimeout(close); };
  }, [onClose]);

  const t = useTranslations();
  return (
    <>
      <style>{`
        @keyframes toast-slide-in {
          from { transform: translateX(calc(100% + 1.5rem)); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .toast-slide-in { animation: toast-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      <div
        role="alert"
        className={`toast-slide-in fixed top-4 right-4 z-50 w-80 bg-white border-l-4 border-brand-red shadow-xl p-4 transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-brand-red" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-navy text-sm">{t('submit.toastCheckEmail')}</p>
            <p className="text-navy/70 text-xs mt-0.5 leading-relaxed">{t('submit.toastVerifyLink')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.dismiss')}
            className="flex-shrink-0 text-navy/30 hover:text-navy/70 transition-colors ml-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

// Main page component
const entityTypeInfo = {
  person: {
    icon: '🧑',
    title: 'Person',
    description: 'Add yourself as a yo-yo player!'
  },
  shop: {
    icon: '🏪',
    title: 'Shop',
    description: 'Add a yo-yo shop or retailer.'
  },
  club: {
    icon: '🎲',
    title: 'Club',
    description: 'Add a yo-yo club or meetup group.'
  }
};

export default function SubmitPage() {
  const t = useTranslations();
  // State and logic for the form
  const [form, setForm] = useState<SubmitInput>({
    entityType: '',
    displayName: '',
    email: '',
    city_id: null,
    region_id: null,
    country_id: null,
    bio: '',
    ageBand: '',
    parentName: '',
    parentEmail: '',
    relationship: '',
    addressLine: '',
    postalCode: '',
    hours: '',
    contactName: '',
    authorizedRep: false,
    clubMeetingInfo: '',
    clubVenuePublic: false,
    venueAddressLine: '',
    venuePostalCode: '',
    instagram: '',
    youtube: '',
    discord: '',
    website: '',
    consentPrivacy: false,
    consentTerms: false,
    consentPublic: false,
    honeypot: '',
  });
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const update = (key: keyof SubmitInput, value: any) => setForm((f: SubmitInput) => ({ ...f, [key]: value }));
  const isMinor = form.entityType === 'person' && form.ageBand === '13-17';
  const countries = useCountries();
  const regions = useRegions(form.country_id);

  useEffect(() => {
    if (result && !result.ok) {
      setTimeout(() => {
        document.querySelector('[data-error="server"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [result]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return;

    // Client-side validation — collect all errors before touching the server
    const errors: Record<string, string> = {};

    if (form.entityType === 'person' && !form.ageBand) {
      errors.ageBand = 'Please select your age group.';
    }
    if (form.country_id === null) {
      errors.country_id = 'Please select your country.';
    }
    if (form.city_id === null) {
      const cityInput = (document.getElementById('city_autocomplete') as HTMLInputElement)?.value?.trim();
      errors.city_id = cityInput
        ? t('submit.errorCitySelectAdd', { city: cityInput })
        : t('submit.errorCitySelectAddGeneric');
    }
    if (!form.consentPublic) {
      errors.consentPublic = t('submit.errorConsentPublic');
    }
    if (!form.consentPrivacy) {
      errors.consentPrivacy = t('submit.errorConsentPrivacy');
    }
    if (!form.consentTerms) {
      errors.consentTerms = t('submit.errorConsentTerms');
    }
    if ((form.entityType === 'shop' || form.entityType === 'club') && !form.authorizedRep) {
      errors.authorizedRep = t('submit.errorAuthorizedRep', { type: form.entityType === 'shop' ? t('submit.business') : t('submit.club') });
    }
    if (isMinor) {
      if (!form.parentName.trim()) errors.parentName = t('submit.errorParentName');
      if (!form.parentEmail.trim()) errors.parentEmail = t('submit.errorParentEmail');
      if (!form.relationship) errors.relationship = t('submit.errorRelationship');
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setTimeout(() => {
        document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    setFormErrors({});
    setSubmitting(true);

    // Build socials as a nested object — the schema expects { socials: {...} }, not flat fields
    if (result?.ok) {
      const isEmailTrouble = result.emailStatus === 'failed';
      const isQueued = result.emailStatus === 'queued';

      const heading = isQueued ? t('submit.savedEmailComing')
        : isEmailTrouble ? t('submit.savedEmailTrouble')
        : t('submit.checkYourEmail');

      const retryHuman = result.retryAt
        ? new Date(result.retryAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
        : null;

      return (
        <>
          {showToast && <SubmitToast onClose={() => setShowToast(false)} />}
          <div className="max-w-xl mx-auto px-4 py-16">
            <div className="card text-center">

              {/* 3-step progress indicator */}
              {!isEmailTrouble && (
                <div className="flex items-center justify-center mb-6">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-brand-red flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-brand-red whitespace-nowrap">{t('submit.submitted')}</span>
                  </div>
                  <div className="w-8 h-0.5 bg-brand-red mb-4 flex-shrink-0" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full border-2 border-brand-red bg-cherry-pink flex items-center justify-center animate-pulse">
                      <svg className="w-5 h-5 text-brand-red" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-brand-red whitespace-nowrap">{t('submit.verifyEmail')}</span>
                  </div>
                  <div className="w-8 h-0.5 bg-navy/20 mb-4 flex-shrink-0" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full border-2 border-navy/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-navy/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-xs text-navy/40 whitespace-nowrap">{t('submit.onTheMap')}</span>
                  </div>
                </div>
              )}

              <h1 className="text-3xl mb-2">{heading}</h1>
              {!isEmailTrouble && !isQueued && (
                <p className="text-navy/80 font-medium mb-3">
                  {t('submit.pinNotOnMap')}
                </p>
              )}

              <p className="text-navy/80 mb-4">{result.message}</p>

              {isQueued && retryHuman && (
                <p className="text-sm bg-cream p-4 border-l-4 border-brand-red text-left">
                  <strong>{t('submit.expectedDelivery')}:</strong> {t('submit.byTime', { time: retryHuman })}<br />
                  {t('submit.emailIsQueued')}
                </p>
              )}

              {isEmailTrouble && (
                <p className="text-sm bg-cherry-pink p-4 border-2 border-brand-red/30 text-left">
                  {t('submit.emailTroubleHelp')}{' '}
                  <a href="mailto:dmvthrowers@gmail.com" className="text-brand-red underline">dmvthrowers@gmail.com</a>{' '}
                  {t('submit.emailTroubleMention')}
                </p>
              )}

              {result.isMinor && !isQueued && !isEmailTrouble && (
                <p className="text-sm bg-cherry-pink p-4 border-2 border-brand-red/30">
                  {t('submit.parentConsentHelp')}
                </p>
              )}

              <p className="text-xs text-navy/60 mt-6 text-left leading-relaxed">
                {t('submit.verifiedOnMap')}
              </p>

              {!isEmailTrouble && (
                <p className="text-xs text-navy/60 mt-2">
                  {t('submit.didntGetIt')}{' '}
                  <a href="mailto:dmvthrowers@gmail.com" className="text-brand-red underline">{t('submit.emailSupport')}</a>
                </p>
              )}

              <Link href="/" className="btn-ghost mt-6 inline-block">{t('submit.backToHome')}</Link>
            </div>
          </div>
        </>
      );
    }

// Removed duplicate/stray JSX block that was causing unterminated/invalid code at the end of the file

  if (!form.entityType) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-red font-bold mb-2">{t('submit.addToMap')}</p>
          <h1 className="text-4xl md:text-5xl mb-2">{t('submit.whatAreYouAdding')}</h1>
          <p className="text-navy/80">{t('submit.chooseType')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {(['person', 'shop', 'club'] as const).map((type) => {
            const info = entityTypeInfo[type];
            return (
              <button
                key={type}
                onClick={() => update('entityType', type)}
                className="card text-left hover:border-brand-red transition-colors group"
              >
                <div className="text-brand-red mb-4 group-hover:scale-110 transition-transform">
                  {info.icon}
                </div>
                <h2 className="text-xl font-bold mb-2">{t(`submit.type.${type}.title`)}</h2>
                <p className="text-sm text-navy/70">{t(`submit.type.${type}.description`)}</p>
              </button>
            );
          })}
        </div>

        <p className="text-center text-sm text-navy/60 mt-8">
          {t('submit.alreadyListed')}{' '}
          <Link href="/profile" className="text-brand-red underline">{t('submit.manageEntry')}</Link>
        </p>
      </div>
    );
  }

  // Form (step 2)
  const entityInfo = entityTypeInfo[form.entityType];

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => update('entityType', '')}
          className="text-sm text-brand-red flex items-center gap-1 mb-4 hover:underline"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t('submit.changeType')}
        </button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-brand-red">{entityInfo.icon}</span>
          <h1 className="text-4xl md:text-5xl">{t('submit.addType', { type: t(`submit.type.${form.entityType}.title`) })}</h1>
        </div>
        <p className="text-navy/80">{t(`submit.type.${form.entityType}.description`)}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {result && !result.ok && (
          <div className="border-2 border-brand-red bg-brand-red/10 p-4 text-sm" data-error="server">{result.message}</div>
        )}
        {/* Honeypot */}
        <div className="hidden" aria-hidden="true">
          <label>Do not fill this field</label>
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.honeypot}
            onChange={(e) => update('honeypot', e.target.value)}
          />
        </div>

        {/* Basic info - all types */}
        <div className="card space-y-4">
          <h2 className="text-2xl">
            {form.entityType === 'person' ? t('submit.aboutYou') : t('submit.basicInfo')}
          </h2>

          <div>
            <label htmlFor="displayName" className="label">
              {form.entityType === 'person'
                ? t('submit.displayName')
                : form.entityType === 'shop'
                ? t('submit.shopName')
                : t('submit.clubName')}{' '}
              *
            </label>
            <input
              id="displayName"
              className="input"
              required
              maxLength={40}
              value={form.displayName}
              onChange={(e) => update('displayName', e.target.value)}
              placeholder={form.entityType === 'person'
                ? t('submit.displayNamePlaceholder')
                : form.entityType === 'shop'
                ? t('submit.shopNamePlaceholder')
                : t('submit.clubNamePlaceholder')}
            />
            <p className="text-xs text-navy/60 mt-1">
              {form.entityType === 'person'
                ? t('submit.displayNameHelp')
                : t('submit.displayNameHelpPublic')}
            </p>
          </div>

          <div>
            <label htmlFor="email" className="label">
              {form.entityType === 'person' ? t('submit.yourEmail') : t('submit.contactEmail')} *
            </label>
            <input
              id="email"
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
            <p className="text-xs text-navy/60 mt-1">
              {t('submit.emailHelp')}
              {form.entityType === 'shop' && ' ' + t('submit.shopEmailVerified')}
            </p>
          </div>

          {/* Person-specific: age band */}
          {form.entityType === 'person' && (
            <div>
              <label className="label">{t('submit.age')} *</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 flex-1 border-2 border-navy/20 p-3 cursor-pointer hover:border-brand-red">
                  <input
                    type="radio"
                    name="ageBand"
                    checked={form.ageBand === '18+'}
                    onChange={() => update('ageBand', '18+')}
                  />
                  <span className="text-sm font-semibold">{t('submit.age18plus')}</span>
                </label>
                <label className="flex items-center gap-2 flex-1 border-2 border-navy/20 p-3 cursor-pointer hover:border-brand-red">
                  <input
                    type="radio"
                    name="ageBand"
                    checked={form.ageBand === '13-17'}
                    onChange={() => update('ageBand', '13-17')}
                  />
                  <span className="text-sm font-semibold">{t('submit.age13to17')}</span>
                </label>
              </div>
              <p className="text-xs text-navy/60 mt-1">{t('submit.ageHelp')}</p>
              {formErrors.ageBand && <p className="text-sm text-brand-red mt-1" data-error="ageBand">{formErrors.ageBand}</p>}
            </div>
          )}

          {/* Shop/Club: contact name (internal) */}
          {(form.entityType === 'shop' || form.entityType === 'club') && (
            <div>
              <label htmlFor="contactName" className="label">Your name (internal) *</label>
              <input
                id="contactName"
                className="input"
                required
                maxLength={100}
                value={form.contactName}
                onChange={(e) => update('contactName', e.target.value)}
                placeholder="e.g. John Smith"
              />
              <p className="text-xs text-navy/60 mt-1">Not shown publicly. Used for our records only.</p>
            </div>
          )}

          <div>
            <label htmlFor="bio" className="label">
              {form.entityType === 'person' ? t('submit.shortBio') : t('submit.description')} ({t('submit.optional')})
            </label>
            <textarea
              id="bio"
              className="input"
              maxLength={280}
              rows={3}
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              placeholder={
                form.entityType === 'person'
                  ? t('submit.bioPersonPlaceholder')
                  : form.entityType === 'shop'
                  ? t('submit.bioShopPlaceholder')
                  : t('submit.bioClubPlaceholder')
              }
            />
            <p className="text-xs text-navy/60 mt-1">{form.bio.length}/280 {t('submit.characters')}</p>
          </div>
        </div>

        {/* Location - all types */}
        <div className="card space-y-4">
          <h2 className="text-2xl">{t('submit.location')}</h2>

          {/* Shop-specific: street address */}
          {form.entityType === 'shop' && (
            <>
              <div>
                <label htmlFor="addressLine" className="label">Street address *</label>
                <input
                  id="addressLine"
                  className="input"
                  required
                  value={form.addressLine}
                  onChange={(e) => update('addressLine', e.target.value)}
                  placeholder="e.g. 123 Main Street"
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="label">Postal/ZIP code</label>
                <input
                  id="postalCode"
                  className="input"
                  maxLength={20}
                  value={form.postalCode}
                  onChange={(e) => update('postalCode', e.target.value)}
                  placeholder="e.g. 22026"
                />
              </div>
            </>
          )}


          {/* Normalized location selectors (replace with dropdowns/autocomplete) */}
          {/* Country dropdown */}
          <div>
            <label htmlFor="country_id" className="label">Country *</label>
            <select
              id="country_id"
              className="input"
              required
              value={form.country_id ?? ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                update('country_id', val);
                update('region_id', null);
                update('city_id', null);
              }}
            >
              <option value="">Select country</option>
              {countries.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {formErrors.country_id && <p className="text-sm text-brand-red mt-1" data-error="country_id">{formErrors.country_id}</p>}
          </div>
          {/* Region dropdown */}
          <div>
            <label htmlFor="region_id" className="label">State/region</label>
            <select
              id="region_id"
              className="input"
              value={form.region_id ?? ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                update('region_id', val);
                update('city_id', null);
              }}
              disabled={!form.country_id}
            >
              <option value="">Select region</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>



          {/* City autocomplete */}
          <CityAutocomplete
            countryId={form.country_id}
            regionId={form.region_id}
            cityId={form.city_id}
            setCityId={(id: number | null) => {
              update('city_id', id);
              if (id !== null) setFormErrors(e => { const n = { ...e }; delete n.city_id; return n; });
            }}
          />
          {formErrors.city_id && (
            <p className="text-sm text-brand-red mt-1" data-error="city_id">{formErrors.city_id}</p>
          )}

          {form.entityType === 'person' && (
            <p className="text-xs bg-cream border-l-4 border-brand-red p-3">
              We&apos;ll place your pin at the center of your city, then blur it by about 10 miles in a random direction. Your real location is never stored.
            </p>
          )}
          {form.entityType === 'shop' && (
            <p className="text-xs bg-cream border-l-4 border-brand-red p-3">
              Your exact address will be shown on the map so customers can find you.
            </p>
          )}
        </div>

        {/* Shop-specific: hours */}
        {form.entityType === 'shop' && (
          <div className="card space-y-4">
            <h2 className="text-2xl">Store hours (optional)</h2>
            <div>
              <label htmlFor="hours" className="label">Hours of operation</label>
              <textarea
                id="hours"
                className="input"
                maxLength={500}
                rows={3}
                value={form.hours}
                onChange={(e) => update('hours', e.target.value)}
                placeholder="e.g. Mon-Fri 10am-6pm, Sat 11am-5pm, Closed Sunday"
              />
            </div>
          </div>
        )}

        {/* Club-specific: meeting info */}
        {form.entityType === 'club' && (
          <div className="card space-y-4">
            <h2 className="text-2xl">Meeting info</h2>

            <div>
              <label htmlFor="clubMeetingInfo" className="label">When and where do you meet? *</label>
              <textarea
                id="clubMeetingInfo"
                className="input"
                required
                maxLength={500}
                rows={3}
                value={form.clubMeetingInfo}
                onChange={(e) => update('clubMeetingInfo', e.target.value)}
                placeholder="e.g. Every Saturday 2-5pm at Central Park pavilion. All skill levels welcome!"
              />
              <p className="text-xs text-navy/60 mt-1">Include day, time, frequency, and general location info.</p>
            </div>

            <div>
              <label className="label">Venue location visibility</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 border-2 border-navy/20 p-3 cursor-pointer hover:border-brand-red">
                  <input
                    type="radio"
                    name="venuePublic"
                    checked={!form.clubVenuePublic}
                    onChange={() => {
                      update('clubVenuePublic', false);
                      update('venueAddressLine', '');
                      update('venuePostalCode', '');
                    }}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-semibold">Private venue</span>
                    <p className="text-xs text-navy/60">Pin shows approximate city location (~10mi blur). Good for rotating venues or safety concerns.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 border-2 border-navy/20 p-3 cursor-pointer hover:border-brand-red">
                  <input
                    type="radio"
                    name="venuePublic"
                    checked={form.clubVenuePublic}
                    onChange={() => update('clubVenuePublic', true)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-semibold">Public venue</span>
                    <p className="text-xs text-navy/60">Pin shows exact address. Good for public parks, community centers, etc.</p>
                  </div>
                </label>
              </div>
            </div>

            {form.clubVenuePublic && (
              <div className="space-y-4 pl-4 border-l-4 border-brand-red">
                <div>
                  <label htmlFor="venueAddressLine" className="label">Venue street address *</label>
                  <input
                    id="venueAddressLine"
                    className="input"
                    required={form.clubVenuePublic}
                    value={form.venueAddressLine}
                    onChange={(e) => update('venueAddressLine', e.target.value)}
                    placeholder="e.g. 123 Park Avenue"
                  />
                </div>
                <div>
                  <label htmlFor="venuePostalCode" className="label">Venue postal/ZIP code</label>
                  <input
                    id="venuePostalCode"
                    className="input"
                    maxLength={20}
                    value={form.venuePostalCode}
                    onChange={(e) => update('venuePostalCode', e.target.value)}
                    placeholder="e.g. 22026"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Socials - all types */}
        <div className="card space-y-4">
          <h2 className="text-2xl">Socials (all optional)</h2>
          <p className="text-sm text-navy/70">
            Share your social links so people can connect with you.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="instagram" className="label">Instagram</label>
              <input
                id="instagram"
                className="input"
                value={form.instagram}
                onChange={(e) => update('instagram', e.target.value)}
                placeholder="handle"
              />
            </div>
            <div>
              <label htmlFor="youtube" className="label">YouTube</label>
              <input
                id="youtube"
                className="input"
                value={form.youtube}
                onChange={(e) => update('youtube', e.target.value)}
                placeholder="channel"
              />
            </div>
            <div>
              <label htmlFor="discord" className="label">Discord</label>
              <input
                id="discord"
                className="input"
                value={form.discord}
                onChange={(e) => update('discord', e.target.value)}
                placeholder="username"
              />
            </div>
            <div>
              <label htmlFor="website" className="label">Website</label>
              <input
                id="website"
                className="input"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Parent consent for minors */}
        {isMinor && (
          <div className="card space-y-4 bg-cherry-pink border-brand-red">
            <h2 className="text-2xl">Parent or guardian info</h2>
            <p className="text-sm">
              Because you&apos;re under 18, we need your parent or guardian to consent before your entry goes live.
              We&apos;ll email them a link to approve.
            </p>

            <div>
              <label htmlFor="parentName" className="label">Parent/guardian full name *</label>
              <input
                id="parentName"
                className="input"
                required={isMinor}
                value={form.parentName}
                onChange={(e) => update('parentName', e.target.value)}
              />
              {formErrors.parentName && <p className="text-sm text-brand-red mt-1" data-error="parentName">{formErrors.parentName}</p>}
            </div>
            <div>
              <label htmlFor="parentEmail" className="label">Parent/guardian email *</label>
              <input
                id="parentEmail"
                className="input"
                type="email"
                required={isMinor}
                value={form.parentEmail}
                onChange={(e) => update('parentEmail', e.target.value)}
              />
              {formErrors.parentEmail && <p className="text-sm text-brand-red mt-1" data-error="parentEmail">{formErrors.parentEmail}</p>}
            </div>
            <div>
              <label htmlFor="relationship" className="label">Relationship *</label>
              <select
                id="relationship"
                className="input"
                required={isMinor}
                value={form.relationship}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update('relationship', e.target.value as SubmitInput['relationship'])}
              >
                <option value="">Select...</option>
                <option value="parent">Parent</option>
                <option value="legal guardian">Legal guardian</option>
              </select>
              {formErrors.relationship && <p className="text-sm text-brand-red mt-1" data-error="relationship">{formErrors.relationship}</p>}
            </div>
          </div>
        )}

        {/* Consent checkboxes */}
        <div className="card space-y-4">
          <h2 className="text-2xl">Your consent</h2>

          <div>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.consentPublic}
                onChange={(e) => update('consentPublic', e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                I understand that the {form.entityType === 'person' ? 'display name, city, bio, and socials' : 'name, location, description, and socials'} will be <strong>publicly visible</strong> on the map.
              </span>
            </label>
            {formErrors.consentPublic && <p className="text-sm text-brand-red mt-1" data-error="consentPublic">{formErrors.consentPublic}</p>}
          </div>

          <div>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.consentPrivacy}
                onChange={(e) => update('consentPrivacy', e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                I have read and accept the <Link href="/legal/privacy" target="_blank" className="text-brand-red underline">Privacy Policy</Link>.
              </span>
            </label>
            {formErrors.consentPrivacy && <p className="text-sm text-brand-red mt-1" data-error="consentPrivacy">{formErrors.consentPrivacy}</p>}
          </div>

          <div>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.consentTerms}
                onChange={(e) => update('consentTerms', e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                I have read and accept the <Link href="/legal/terms" target="_blank" className="text-brand-red underline">Terms of Service</Link>.
              </span>
            </label>
            {formErrors.consentTerms && <p className="text-sm text-brand-red mt-1" data-error="consentTerms">{formErrors.consentTerms}</p>}
          </div>

          {/* Authorized rep checkbox for shop/club */}
          {(form.entityType === 'shop' || form.entityType === 'club') && (
            <div>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.authorizedRep}
                  onChange={(e) => update('authorizedRep', e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">
                  {t('submit.authorizedRepAttestation', { type: form.entityType === 'shop' ? t('submit.business') : t('submit.club') })}
                </span>
              </label>
              {formErrors.authorizedRep && <p className="text-sm text-brand-red mt-1" data-error="authorizedRep">{formErrors.authorizedRep}</p>}
            </div>
          )}
        </div>

        <p className="text-sm text-navy/60 text-center bg-cream border border-navy/10 p-3">
          {t('submit.afterSubmit')}
        </p>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? t('submit.submitting') : t('submit.submitWithEntity', { entity: entityInfo.title })}
        </button>

        <p className="text-xs text-navy/60 text-center">
          {t('submit.editDeleteInstruction', { profileLink: t('submit.myEntry') })}
          {/* To add a link, split the translation and render <Link> separately if needed. */}
        </p>
      </form>
    </div>
  );
}

