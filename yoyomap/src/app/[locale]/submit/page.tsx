'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

type EntityType = '' | 'person' | 'shop' | 'club';

type FormState = {
  entityType: EntityType;
  displayName: string;
  email: string;
  city_id: number | null;
  region_id: number | null;
  country_id: number | null;
  bio: string;
  ageBand: '' | '13-17' | '18+';
  parentName: string;
  parentEmail: string;
  relationship: '' | 'parent' | 'legal guardian';
  addressLine: string;
  postalCode: string;
  hours: string;
  contactName: string;
  authorizedRep: boolean;
  clubMeetingInfo: string;
  clubVenuePublic: boolean;
  venueAddressLine: string;
  venuePostalCode: string;
  instagram: string;
  youtube: string;
  discord: string;
  website: string;
  consentPrivacy: boolean;
  consentTerms: boolean;
  consentPublic: boolean;
  honeypot: string;
};

function useCountries() {
  const [countries, setCountries] = useState<{ id: number; code: string; name: string }[]>([]);
  useEffect(() => {
    fetch('/api/locations?type=countries')
     .then(r => r.json())
     .then(d => setCountries(d.countries || []))
     .catch(() => {});
  }, []);
  return countries;
}

function useRegions(countryId: number | null) {
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    if (!countryId) { setRegions([]); return; }
    fetch(`/api/locations?type=regions&countryId=${countryId}`)
     .then(r => r.json())
     .then(d => setRegions(d.regions || []))
     .catch(() => {});
  }, [countryId]);
  return regions;
}

function useAllCities(countryId: number | null, regionId: number | null, refreshKey = 0) {
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    if (!countryId) { setCities([]); return; }
    const params = new URLSearchParams({ type: 'cities', countryId: String(countryId) });
    if (regionId) params.set('regionId', String(regionId));
    fetch(`/api/locations?${params}`)
     .then(r => r.json())
     .then(d => setCities(d.cities || []))
     .catch(() => {});
  }, [countryId, regionId, refreshKey]);
  return cities;
}

function CityAutocomplete({ countryId, regionId, cityId, setCityId }: {
  countryId: number | null; regionId: number | null; cityId: number | null; setCityId: (id: number | null) => void;
}) {
  const t = useTranslations();
  const [refreshKey, setRefreshKey] = useState(0);
  const allCities = useAllCities(countryId, regionId, refreshKey);
  const [input, setInput] = useState('');
  const [show, setShow] = useState(false);
  const [adding, setAdding] = useState(false);
  const selected = allCities.find(c => c.id === cityId);

  useEffect(() => { if (selected) setInput(selected.name); else if (!cityId) setInput(''); }, [selected, cityId]);

  const filtered = input? allCities.filter(c => c.name.toLowerCase().includes(input.toLowerCase())) : allCities;
  const isNew = input.trim().length > 1 &&!filtered.some(c => c.name.toLowerCase() === input.trim().toLowerCase());

  async function addCity() {
    if (!countryId) return;
    setAdding(true);
    try {
      const res = await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: input.trim(), countryId, regionId }) });
      const data = await res.json();
      if (res.ok && data.city?.id) { setCityId(data.city.id); setInput(data.city.name); setShow(false); setRefreshKey(k => k+1); }
      else alert(data.error?.message || 'Failed');
    } finally { setAdding(false); }
  }

  return (
    <div className="relative">
      <input id="city_autocomplete" className="input" value={input} onChange={e => { setInput(e.target.value); setShow(true); }} onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 150)} placeholder="City" autoComplete="off" />
      {show && filtered.length > 0 && (
        <ul className="absolute z-10 bg-white border w-full max-h-48 overflow-auto">
          {filtered.slice(0,10).map(c => (
            <li key={c.id} className="px-2 py-1 hover:bg-gray-100 cursor-pointer" onMouseDown={() => { setCityId(c.id); setInput(c.name); setShow(false); }}>{c.name}</li>
          ))}
        </ul>
      )}
      {isNew && (
        <div className="mt-2">
          <p className="text-xs text-text-muted mb-1">{t('submit.addCityHint')}</p>
          <button
            type="button"
            disabled={adding}
            onClick={addCity}
            className="bg-navy text-cream py-2 px-4 min-h-11 text-xs font-bold uppercase tracking-wider w-full disabled:opacity-50"
          >
            {adding ? t('submit.addCityAdding') : t('submit.addCityButton', { city: input.trim() })}
          </button>
        </div>
      )}
    </div>
  );
}

function SubmitToast({ onClose }: { onClose: () => void }) {
  const [fading, setFading] = useState(false);
  const t = useTranslations();
  useEffect(() => { const f = setTimeout(() => setFading(true), 5000); const c = setTimeout(onClose, 6000); return () => { clearTimeout(f); clearTimeout(c); }; }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 w-80 bg-white border-l-4 border-brand-red shadow-xl p-4 transition-opacity ${fading?'opacity-0':'opacity-100'}`}>
      <p className="font-bold text-sm">{t('submit.toastCheckEmail')}</p>
      <p className="text-xs">{t('submit.toastVerifyLink')}</p>
      <button onClick={onClose} className="absolute top-1 right-2">×</button>
    </div>
  );
}

const entityTypeInfo = {
  person: { icon: '🧑', title: 'Person', description: 'Add yourself as a yo-yo player!' },
  shop: { icon: '🏪', title: 'Shop', description: 'Add a yo-yo shop or retailer.' },
  club: { icon: '🎲', title: 'Club', description: 'Add a yo-yo club or meetup group.' }
};

export default function SubmitPage() {
  const t = useTranslations();
  const [form, setForm] = useState<FormState>({
    entityType: '', displayName: '', email: '', city_id: null, region_id: null, country_id: null,
    bio: '', ageBand: '', parentName: '', parentEmail: '', relationship: '',
    addressLine: '', postalCode: '', hours: '', contactName: '', authorizedRep: false,
    clubMeetingInfo: '', clubVenuePublic: false, venueAddressLine: '', venuePostalCode: '',
    instagram: '', youtube: '', discord: '', website: '',
    consentPrivacy: false, consentTerms: false, consentPublic: false, honeypot: '',
  });
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({...f, [k]: v}));
  const isMinor = form.entityType === 'person' && form.ageBand === '13-17';
  const countries = useCountries();
  const regions = useRegions(form.country_id);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return;
    const errors: Record<string, string> = {};
    if (form.entityType === 'person' &&!form.ageBand) errors.ageBand = t('submit.errorAgeBand');
    if (form.country_id === null) errors.country_id = t('submit.errorCountry');
    if (form.city_id === null) {
      const cityInput = (document.getElementById('city_autocomplete') as HTMLInputElement)?.value?.trim();
      errors.city_id = cityInput? t('submit.errorCitySelectAdd', { city: cityInput }) : t('submit.errorCitySelectAddGeneric');
    }
    if (!form.consentPublic) errors.consentPublic = t('submit.errorConsentPublic');
    if (!form.consentPrivacy) errors.consentPrivacy = t('submit.errorConsentPrivacy');
    if (!form.consentTerms) errors.consentTerms = t('submit.errorConsentTerms');
    if ((form.entityType === 'shop' || form.entityType === 'club') &&!form.authorizedRep) errors.authorizedRep = t('submit.errorAuthorizedRep', { type: form.entityType === 'shop'? t('submit.business') : t('submit.club') });
    if (form.entityType === 'shop' &&!form.addressLine.trim()) errors.addressLine = t('submit.errorAddressLine');
    if (form.entityType === 'shop' &&!form.contactName.trim()) errors.contactName = t('submit.errorContactName');
    if (form.entityType === 'club' && form.clubMeetingInfo.trim().length < 10) errors.clubMeetingInfo = t('submit.errorMeetingInfo');
    if (form.entityType === 'club' &&!form.contactName.trim()) errors.contactName = t('submit.errorContactName');
    if (isMinor) {
      if (!form.parentName.trim()) errors.parentName = t('submit.errorParentName');
      if (!form.parentEmail.trim()) errors.parentEmail = t('submit.errorParentEmail');
      if (!form.relationship) errors.relationship = t('submit.errorRelationship');
    }
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setFormErrors({});
    setSubmitting(true);

    const socials: Record<string,string> = {};
    if (form.instagram) socials.instagram = form.instagram.trim();
    if (form.youtube) socials.youtube = form.youtube.trim();
    if (form.discord) socials.discord = form.discord.trim();
    if (form.website) socials.website = form.website.includes('://')? form.website : `https://${form.website}`;

    const payload = {...form,...(Object.keys(socials).length? { socials } : {}) };
    delete (payload as any).instagram; delete (payload as any).youtube; delete (payload as any).discord; delete (payload as any).website;

    try {
      const res = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) setResult({ ok: false, message: data.error?.message });
      else { setShowToast(true); setResult({ ok: true, message: data.message, isMinor, emailStatus: data.emailStatus, retryAt: data.retryAt }); }
    } catch { setResult({ ok: false, message: t('submit.errorNetwork') }); }
    finally { setSubmitting(false); }
  }

  if (result?.ok) {
    const isEmailTrouble = result.emailStatus === 'failed';
    const isQueued = result.emailStatus === 'queued';
    const heading = isQueued? t('submit.savedEmailComing') : isEmailTrouble? t('submit.savedEmailTrouble') : t('submit.checkYourEmail');
    return (
      <>
        {showToast && <SubmitToast onClose={() => setShowToast(false)} />}
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl mb-4">{heading}</h1>
          <p className="mb-4">{result.message}</p>
          {result.isMinor && <p className="text-sm bg-cherry-pink p-3">{t('submit.parentConsentHelp')}</p>}
          <Link href="/" className="btn-ghost mt-6 inline-block">{t('submit.backToHome')}</Link>
        </div>
      </>
    );
  }

  if (!form.entityType) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-red font-bold mb-2">{t('submit.addToMap')}</p>
        <h1 className="text-4xl mb-2">{t('submit.whatAreYouAdding')}</h1>
        <p className="mb-6">{t('submit.chooseType')}</p>
        <div className="grid gap-4 md:grid-cols-3">
          {(['person','shop','club'] as const).map(type => (
            <button key={type} onClick={() => update('entityType', type)} className="card text-left hover:border-brand-red">
              <div className="text-2xl mb-2">{entityTypeInfo[type].icon}</div>
              <h2 className="font-bold">{t(`submit.type.${type}.title`)}</h2>
              <p className="text-sm">{t(`submit.type.${type}.description`)}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button type="button" onClick={() => update('entityType','')} className="text-sm text-brand-red mb-4">← {t('submit.changeType')}</button>
      <h1 className="text-4xl mb-6">{t('submit.addType', { type: t(`submit.type.${form.entityType}.title`) })}</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        {result &&!result.ok && <div className="border-2 border-red-500 p-3">{result.message}</div>}
        <div className="hidden">
          <input 
            value={form.honeypot} 
            onChange={e=>update('honeypot',e.target.value)} 
            aria-label="Leave this field blank" 
            title="Leave this field blank" 
            placeholder="Leave blank" 
          />
        </div>

        <div className="card space-y-4">
          <input className="input" placeholder={t('submit.displayName')} required value={form.displayName} onChange={e=>update('displayName',e.target.value)} />
          <input className="input" type="email" placeholder={t('submit.yourEmail')} required value={form.email} onChange={e=>update('email',e.target.value)} />
          {form.entityType==='person' && (
            <div className="flex gap-3">
              <label><input type="radio" checked={form.ageBand==='18+'} onChange={()=>update('ageBand','18+')} /> {t('submit.age18plus')}</label>
              <label><input type="radio" checked={form.ageBand==='13-17'} onChange={()=>update('ageBand','13-17')} /> {t('submit.age13to17')}</label>
            </div>
          )}
          {formErrors.ageBand && <p className="text-red-600 text-sm">{formErrors.ageBand}</p>}
        </div>

        <div className="card space-y-4">
          <label htmlFor="country_id" className="sr-only">{t('submit.selectCountry')}</label>
          <select
            id="country_id"
            className="input"
            value={form.country_id??''}
            onChange={e=>{
              update('country_id', e.target.value?Number(e.target.value):null);
              update('region_id',null);
              update('city_id',null);
            }}
            required
            aria-label={t('submit.selectCountry')}
          >
            <option value="">{t('submit.selectCountry')}</option>
            {countries.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {formErrors.country_id && <p className="text-red-600 text-sm">{formErrors.country_id}</p>}

          <label htmlFor="region_id" className="sr-only">{t('submit.selectRegion')}</label>
          <select 
            id="region_id"
            className="input" 
            value={form.region_id??''} 
            onChange={e=>{update('region_id', e.target.value?Number(e.target.value):null); update('city_id',null);}} 
            disabled={!form.country_id}
            aria-label={t('submit.selectRegion')}
            title={t('submit.selectRegion')}
          >
            <option value="">{t('submit.selectRegion')}</option>
            {regions.map(r=> <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <CityAutocomplete countryId={form.country_id} regionId={form.region_id} cityId={form.city_id} setCityId={id=>{update('city_id',id); if(id) setFormErrors(e=>{const n={...e}; delete n.city_id; return n;});}} />
          {formErrors.city_id && <p className="text-red-600 text-sm">{formErrors.city_id}</p>}
        </div>

        {isMinor && (
          <div className="card bg-cherry-pink space-y-3">
            <h2 className="text-xl">{t('submit.parentInfo')}</h2>
            <input className="input" placeholder={t('submit.parentName')} value={form.parentName} onChange={e=>update('parentName',e.target.value)} />
            <input className="input" type="email" placeholder={t('submit.parentEmail')} value={form.parentEmail} onChange={e=>update('parentEmail',e.target.value)} />
            <label htmlFor="relationship" className="sr-only">{t('submit.selectRelationship')}</label>
            <select 
              id="relationship"
              className="input" 
              value={form.relationship} 
              onChange={e=>update('relationship', e.target.value as any)}
              aria-label={t('submit.selectRelationship')}
              title={t('submit.selectRelationship')}
            >
              <option value="">{t('submit.selectRelationship')}</option>
              <option value="parent">{t('submit.parent')}</option>
              <option value="legal guardian">{t('submit.guardian')}</option>
            </select>
          </div>
        )}

        {/* Shop-specific fields */}
        {form.entityType === 'shop' && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-lg">🏪 {t('submit.shopDetails')}</h2>
            <div>
              <label className="label">{t('submit.contactName')}</label>
              <input className="input" placeholder={t('submit.contactNamePlaceholder')} value={form.contactName} onChange={e=>update('contactName',e.target.value)} />
              {formErrors.contactName && <p className="text-red-600 text-sm">{formErrors.contactName}</p>}
            </div>
            <div>
              <label className="label">{t('submit.addressLine')}</label>
              <input className="input" placeholder={t('submit.addressLinePlaceholder')} value={form.addressLine} onChange={e=>update('addressLine',e.target.value)} />
              {formErrors.addressLine && <p className="text-red-600 text-sm">{formErrors.addressLine}</p>}
            </div>
            <div>
              <label className="label">{t('submit.postalCode')}</label>
              <input 
                className="input" 
                value={form.postalCode} 
                onChange={e=>update('postalCode',e.target.value)} 
                placeholder={t('submit.postalCode')} 
                title={t('submit.postalCode')} 
                aria-label={t('submit.postalCode')} 
              />
            </div>
            <div>
              <label className="label">{t('submit.hours')}</label>
              <textarea className="input" rows={3} placeholder={t('submit.hoursPlaceholder')} value={form.hours} onChange={e=>update('hours',e.target.value)} />
            </div>
          </div>
        )}

        {/* Club-specific fields */}
        {form.entityType === 'club' && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-lg">🎲 {t('submit.clubDetails')}</h2>
            <div>
              <label className="label">{t('submit.contactName')}</label>
              <input className="input" placeholder={t('submit.contactNamePlaceholder')} value={form.contactName} onChange={e=>update('contactName',e.target.value)} />
              {formErrors.contactName && <p className="text-red-600 text-sm">{formErrors.contactName}</p>}
            </div>
            <div>
              <label className="label">{t('submit.meetingInfo')}</label>
              <textarea className="input" rows={4} placeholder={t('submit.meetingInfoPlaceholder')} value={form.clubMeetingInfo} onChange={e=>update('clubMeetingInfo',e.target.value)} />
              {formErrors.clubMeetingInfo && <p className="text-red-600 text-sm">{formErrors.clubMeetingInfo}</p>}
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.clubVenuePublic} onChange={e=>update('clubVenuePublic',e.target.checked)} />
              {t('submit.venuePublic')}
            </label>
            {form.clubVenuePublic && (
              <div className="space-y-3 pl-4 border-l-2 border-brand-red/30">
                <div>
                  <label className="label">{t('submit.venueAddressLine')}</label>
                  <input className="input" placeholder={t('submit.addressLinePlaceholder')} value={form.venueAddressLine} onChange={e=>update('venueAddressLine',e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('submit.venuePostalCode')}</label>
                  <input 
                    className="input" 
                    value={form.venuePostalCode} 
                    onChange={e=>update('venuePostalCode',e.target.value)} 
                    placeholder={t('submit.postalCode')} 
                    title={t('submit.postalCode')} 
                    aria-label={t('submit.postalCode')} 
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bio & Social Links */}
        <div className="card space-y-4">
          <div>
            <label className="label">{t('submit.bio')}</label>
            <textarea className="input" rows={3} maxLength={280} placeholder={t('submit.bioPlaceholder')} value={form.bio} onChange={e=>update('bio',e.target.value)} />
          </div>
          <p className="font-semibold text-sm">{t('submit.socialLinks')}</p>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Instagram" value={form.instagram} onChange={e=>update('instagram',e.target.value)} />
            <input className="input" placeholder="YouTube" value={form.youtube} onChange={e=>update('youtube',e.target.value)} />
            <input className="input" placeholder="Discord" value={form.discord} onChange={e=>update('discord',e.target.value)} />
            <input className="input" placeholder="Website" value={form.website} onChange={e=>update('website',e.target.value)} />
          </div>
        </div>

        <div className="card space-y-3">
          <label className="flex gap-2"><input type="checkbox" checked={form.consentPublic} onChange={e=>update('consentPublic',e.target.checked)} /> {t('submit.consentPublic')}</label>
          <label className="flex gap-2"><input type="checkbox" checked={form.consentPrivacy} onChange={e=>update('consentPrivacy',e.target.checked)} /> {t('submit.consentPrivacy')} <Link href="/legal/privacy" className="underline">{t('submit.privacyPolicy')}</Link></label>
          <label className="flex gap-2"><input type="checkbox" checked={form.consentTerms} onChange={e=>update('consentTerms',e.target.checked)} /> {t('submit.consentTerms')} <Link href="/legal/terms" className="underline">{t('submit.terms')}</Link></label>
          {(form.entityType==='shop'||form.entityType==='club') && (
            <label className="flex gap-2"><input type="checkbox" checked={form.authorizedRep} onChange={e=>update('authorizedRep',e.target.checked)} /> {t('submit.authorizedRep')}</label>
          )}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting? t('submit.submitting') : t('submit.submit')}</button>
      </form>
    </div>
  );
}