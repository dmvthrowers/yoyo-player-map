'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
// Utility hooks to fetch countries, regions, and all cities for autocomplete
function useCountries() {
  const [countries, setCountries] = useState<{ id: number; code: string; name: string }[]>([]);
  useEffect(() => {
    (async () => {
      const supabase = createAdminClient();
      const { data } = await supabase.from('countries').select('id, code, name').order('name');
      setCountries(data || []);
    })();
  }, []);
  return countries;
}

function useRegions(countryId: number | null) {
  const [regions, setRegions] = useState<{ id: number; code: string; name: string }[]>([]);
  useEffect(() => {
    if (!countryId) { setRegions([]); return; }
    (async () => {
      const supabase = createAdminClient();
      const { data } = await supabase.from('regions').select('id, code, name').eq('country_id', countryId).order('name');
      setRegions(data || []);
    })();
  }, [countryId]);
  return regions;
}

function useAllCities(countryId: number | null, regionId: number | null) {
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    if (!countryId) { setCities([]); return; }
    (async () => {
      const supabase = createAdminClient();
      let query = supabase.from('cities').select('id, name').eq('country_id', countryId);
      if (regionId) query = query.eq('region_id', regionId);
      const { data } = await query.order('name');
      setCities(data || []);
    })();
  }, [countryId, regionId]);
  return cities;
}
import Link from 'next/link';

type EntityType = '' | 'person' | 'shop' | 'club';

interface FormState {
  entityType: EntityType;
  displayName: string;
  email: string;
  city_id: number | null;
  region_id: number | null;
  country_id: number | null;
  bio: string;
  // Person fields
  ageBand: '' | '13-17' | '18+';
  parentName: string;
  parentEmail: string;
  relationship: '' | 'parent' | 'legal guardian';
  // Shop fields
  addressLine: string;
  postalCode: string;
  hours: string;
  contactName: string;
  authorizedRep: boolean;
  // Club fields
  clubMeetingInfo: string;
  clubVenuePublic: boolean;
  venueAddressLine: string;
  venuePostalCode: string;
  // Socials
  instagram: string;
  youtube: string;
  discord: string;
  website: string;
  // Consent
  consentPrivacy: boolean;
  consentTerms: boolean;
  consentPublic: boolean;
  honeypot: string;
}

const initial: FormState = {
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
};

const entityTypeInfo: Record<Exclude<EntityType, ''>, { title: string; description: string; icon: React.ReactNode }> = {
  person: {
    title: 'Person',
    description: 'Individual yo-yo thrower. Your location will be blurred to ~10 miles for privacy.',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    ),
  },
  shop: {
    title: 'Yo-Yo Shop',
    description: 'Physical retail store. Your exact address will be shown on the map.',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  club: {
    title: 'Yo-Yo Club',
    description: 'Local meet-up group. Choose whether to show exact venue or general area.',
    icon: (
      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
};

export default function SubmitPage() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | {
    ok: boolean;
    message: string;
    entityType?: EntityType;
    isMinor?: boolean;
    emailStatus?: 'sent' | 'queued' | 'failed' | 'partial_failed';
    retryAt?: string;
  }>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isMinor = form.entityType === 'person' && form.ageBand === '13-17';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    // Build payload based on entity type
    const basePayload = {
      entityType: form.entityType,
      displayName: form.displayName,
      email: form.email,
      city_id: form.city_id,
      region_id: form.region_id,
      country_id: form.country_id,
      bio: form.bio || undefined,
      socials: {
        instagram: form.instagram || undefined,
        youtube: form.youtube || undefined,
        discord: form.discord || undefined,
        website: form.website || undefined,
      },
      consentPrivacy: form.consentPrivacy,
      consentTerms: form.consentTerms,
      consentPublic: form.consentPublic,
      honeypot: form.honeypot,
    };

    let payload;
    switch (form.entityType) {
      case 'person':
        payload = {
          ...basePayload,
          ageBand: form.ageBand,
          parentName: form.parentName || undefined,
          parentEmail: form.parentEmail || undefined,
          relationship: form.relationship || undefined,
        };
        break;
      case 'shop':
        payload = {
          ...basePayload,
          addressLine: form.addressLine,
          postalCode: form.postalCode || undefined,
          hours: form.hours || undefined,
          contactName: form.contactName,
          authorizedRep: form.authorizedRep,
        };
        break;
      case 'club':
        payload = {
          ...basePayload,
          clubMeetingInfo: form.clubMeetingInfo,
          clubVenuePublic: form.clubVenuePublic,
          venueAddressLine: form.venueAddressLine || undefined,
          venuePostalCode: form.venuePostalCode || undefined,
          contactName: form.contactName,
          authorizedRep: form.authorizedRep,
        };
        break;
      default:
        setResult({ ok: false, message: 'Please select what type of entry you want to add.' });
        setSubmitting(false);
        return;
    }

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error?.message || 'Something went wrong. Please try again.' });
      } else {
        setResult({
          ok: true,
          message: data.message,
          entityType: form.entityType,
          isMinor,
          emailStatus: data.emailStatus,
          retryAt: data.retryAt,
        });
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  // Success state — three flavors based on whether the verification email was
  // actually delivered, queued for later, or permanently failed.
  if (result?.ok) {
    const heading =
      result.emailStatus === 'queued' ? "Saved — email coming soon"
      : result.emailStatus === 'failed' ? "Saved — email trouble"
      : "Check your email";

    const retryHuman = result.retryAt
      ? new Date(result.retryAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : null;

    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="card text-center">
          <h1 className="text-3xl mb-4">{heading}</h1>
          <p className="text-navy/80 mb-4">{result.message}</p>

          {result.emailStatus === 'queued' && retryHuman && (
            <p className="text-sm bg-cream p-4 border-l-4 border-brand-red text-left">
              <strong>Expected delivery:</strong> by {retryHuman} (your local time).<br />
              You don&apos;t need to do anything — the email is queued and will send automatically.
            </p>
          )}

          {result.emailStatus === 'failed' && (
            <p className="text-sm bg-cherry-pink p-4 border-2 border-brand-red/30 text-left">
              Please email <a href="mailto:dmvthrowers@gmail.com" className="text-brand-red underline">dmvthrowers@gmail.com</a> and mention the email address you used so we can finish verifying your entry.
            </p>
          )}

          {result.isMinor && result.emailStatus !== 'queued' && result.emailStatus !== 'failed' && (
            <p className="text-sm bg-cherry-pink p-4 border-2 border-brand-red/30">
              We also sent a consent request to your parent or guardian. Your entry will appear on the map once they confirm.
            </p>
          )}

          <p className="text-xs text-navy/60 mt-6 text-left leading-relaxed">
            Once verified, you&apos;ll appear on the map within a few minutes. Showing up in
            Google search for your city can take 1–2 weeks — that&apos;s normal and out of
            our control.
          </p>

          <Link href="/" className="btn-ghost mt-6 inline-block">Back to home</Link>
        </div>
      </div>
    );
  }

  // Entity type picker (step 1)
  if (!form.entityType) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-red font-bold mb-2">Add to the Map</p>
          <h1 className="text-4xl md:text-5xl mb-2">What are you adding?</h1>
          <p className="text-navy/80">Choose the type of entry you want to create.</p>
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
                <h2 className="text-xl font-bold mb-2">{info.title}</h2>
                <p className="text-sm text-navy/70">{info.description}</p>
              </button>
            );
          })}
        </div>

        <p className="text-center text-sm text-navy/60 mt-8">
          Already listed? <Link href="/profile" className="text-brand-red underline">Manage your entry</Link>
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
          Change type
        </button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-brand-red">{entityInfo.icon}</span>
          <h1 className="text-4xl md:text-5xl">Add {entityInfo.title}</h1>
        </div>
        <p className="text-navy/80">{entityInfo.description}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
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
            {form.entityType === 'person' ? 'About you' : 'Basic info'}
          </h2>

          <div>
            <label htmlFor="displayName" className="label">
              {form.entityType === 'person' ? 'Display name' : form.entityType === 'shop' ? 'Shop name' : 'Club name'} *
            </label>
            <input
              id="displayName"
              className="input"
              required
              maxLength={40}
              value={form.displayName}
              onChange={(e) => update('displayName', e.target.value)}
              placeholder={form.entityType === 'person' ? 'e.g. CaptnRogers' : form.entityType === 'shop' ? 'e.g. YoYo World' : 'e.g. DC Throwers'}
            />
            <p className="text-xs text-navy/60 mt-1">
              {form.entityType === 'person' ? 'Shown publicly. Use a handle, not your real name if you prefer.' : 'Shown publicly on the map.'}
            </p>
          </div>

          <div>
            <label htmlFor="email" className="label">
              {form.entityType === 'person' ? 'Your email' : 'Contact email'} *
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
              Never shown publicly. Used to verify and let you manage your listing.
              {form.entityType === 'shop' && ' If this matches your website domain, you\'ll get a verified badge.'}
            </p>
          </div>

          {/* Person-specific: age band */}
          {form.entityType === 'person' && (
            <div>
              <label className="label">Age *</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 flex-1 border-2 border-navy/20 p-3 cursor-pointer hover:border-brand-red">
                  <input
                    type="radio"
                    name="ageBand"
                    checked={form.ageBand === '18+'}
                    onChange={() => update('ageBand', '18+')}
                  />
                  <span className="text-sm font-semibold">18 or older</span>
                </label>
                <label className="flex items-center gap-2 flex-1 border-2 border-navy/20 p-3 cursor-pointer hover:border-brand-red">
                  <input
                    type="radio"
                    name="ageBand"
                    checked={form.ageBand === '13-17'}
                    onChange={() => update('ageBand', '13-17')}
                  />
                  <span className="text-sm font-semibold">13 to 17</span>
                </label>
              </div>
              <p className="text-xs text-navy/60 mt-1">You must be at least 13. Under 18 needs a parent or guardian to consent.</p>
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
              {form.entityType === 'person' ? 'Short bio' : 'Description'} (optional)
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
                  ? 'What do you throw? What brands? Any tricks you\'re working on?'
                  : form.entityType === 'shop'
                  ? 'What brands do you carry? Any specialties?'
                  : 'What styles do you throw? All skill levels welcome?'
              }
            />
            <p className="text-xs text-navy/60 mt-1">{form.bio.length}/280 characters</p>
          </div>
        </div>

        {/* Location - all types */}
        <div className="card space-y-4">
          <h2 className="text-2xl">Location</h2>

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
              {useCountries().map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
              {useRegions(form.country_id).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          {/* City autocomplete */}
          <CityAutocomplete
            countryId={form.country_id}
            regionId={form.region_id}
            cityId={form.city_id}
            setCityId={id => update('city_id', id)}
          />

// CityAutocomplete component
function CityAutocomplete({ countryId, regionId, cityId, setCityId }: {
  countryId: number | null;
  regionId: number | null;
  cityId: number | null;
  setCityId: (id: number | null) => void;
}) {
  const allCities = useAllCities(countryId, regionId);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedCity = allCities.find(c => c.id === cityId);

  useEffect(() => {
    setInput(selectedCity ? selectedCity.name : '');
  }, [countryId, regionId, cityId]);

  const filtered = input
    ? allCities.filter(c => c.name.toLowerCase().includes(input.toLowerCase()))
    : allCities;

  // Check if input is a new city (not in list, not empty)
  const isNewCity = input.trim().length > 1 && !filtered.some(c => c.name.toLowerCase() === input.trim().toLowerCase());

  async function handleAddCity() {
    if (!countryId) return;
    setAdding(true);
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('cities').insert({
      name: input.trim(),
      country_id: countryId,
      region_id: regionId || null,
    }).select('id').single();
    setAdding(false);
    if (data && data.id) {
      setCityId(data.id);
      setShowSuggestions(false);
    } else {
      alert('Failed to add city.');
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <label htmlFor="city_autocomplete" className="label">City or town *</label>
      <input
        id="city_autocomplete"
        className="input"
        required
        ref={inputRef}
        value={input}
        onChange={e => {
          setInput(e.target.value);
          setShowSuggestions(true);
          setCityId(null);
        }}
        onFocus={() => setShowSuggestions(true)}
        autoComplete="off"
        placeholder="Start typing your city..."
        disabled={!countryId}
      />
      {showSuggestions && filtered.length > 0 && (
        <ul style={{
          position: 'absolute',
          zIndex: 10,
          background: 'white',
          border: '1px solid #ccc',
          width: '100%',
          maxHeight: 180,
          overflowY: 'auto',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}>
          {filtered.slice(0, 20).map(city => (
            <li
              key={city.id}
              style={{ padding: '8px', cursor: 'pointer', background: city.id === cityId ? '#f3f3f3' : undefined }}
              onMouseDown={() => {
                setInput(city.name);
                setCityId(city.id);
                setShowSuggestions(false);
              }}
            >
              {city.name}
            </li>
          ))}
        </ul>
      )}
      {showSuggestions && filtered.length === 0 && !isNewCity && (
        <div style={{ position: 'absolute', zIndex: 10, background: 'white', border: '1px solid #ccc', width: '100%', padding: 8 }}>
          No cities found.
        </div>
      )}
      {showSuggestions && isNewCity && (
        <div style={{ position: 'absolute', zIndex: 10, background: 'white', border: '1px solid #ccc', width: '100%', padding: 8 }}>
          <button
            type="button"
            className="btn"
            disabled={adding}
            onMouseDown={handleAddCity}
            style={{ width: '100%', textAlign: 'left' }}
          >
            {adding ? 'Adding...' : `Add "${input.trim()}" as a new city`}
          </button>
        </div>
      )}
    </div>
  );
}

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
            </div>
            <div>
              <label htmlFor="relationship" className="label">Relationship *</label>
              <select
                id="relationship"
                className="input"
                required={isMinor}
                value={form.relationship}
                onChange={(e) => update('relationship', e.target.value as FormState['relationship'])}
              >
                <option value="">Select...</option>
                <option value="parent">Parent</option>
                <option value="legal guardian">Legal guardian</option>
              </select>
            </div>
          </div>
        )}

        {/* Consent checkboxes */}
        <div className="card space-y-4">
          <h2 className="text-2xl">Your consent</h2>

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

          {/* Authorized rep checkbox for shop/club */}
          {(form.entityType === 'shop' || form.entityType === 'club') && (
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.authorizedRep}
                onChange={(e) => update('authorizedRep', e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                I am authorized to list this {form.entityType === 'shop' ? 'business' : 'club'} on the map. *
              </span>
            </label>
          )}
        </div>

        {result && !result.ok && (
          <div className="border-2 border-brand-red bg-brand-red/10 p-4 text-sm">{result.message}</div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Submitting...' : `Submit ${entityInfo.title}`}
        </button>

        <p className="text-xs text-navy/60 text-center">
          You can edit or delete your entry anytime. Just visit the <Link href="/profile" className="underline">My Entry</Link> page and we&apos;ll send a magic link.
        </p>
      </form>
    </div>
  );
}
