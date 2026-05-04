import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { apiUrl } from "../lib/api";

type EntityType = "" | "person" | "shop" | "club";

interface FormState {
  entityType: EntityType;
  displayName: string;
  email: string;
  city_id: number | null;
  region_id: number | null;
  country_id: number | null;
  bio: string;
  ageBand: "" | "13-17" | "18+";
  parentName: string;
  parentEmail: string;
  relationship: "" | "parent" | "legal guardian";
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
}

interface Country { id: number; code: string; name: string; }
interface Region { id: number; name: string; }
interface City { id: number; name: string; }

function useCountries() {
  const [countries, setCountries] = useState<Country[]>([]);
  useEffect(() => {
    fetch(apiUrl("/api/locations?type=countries"))
      .then((r) => r.json())
      .then((d) => setCountries(d.countries ?? []))
      .catch(() => {});
  }, []);
  return countries;
}

function useRegions(countryId: number | null) {
  const [regions, setRegions] = useState<Region[]>([]);
  useEffect(() => {
    if (!countryId) { setRegions([]); return; }
    fetch(apiUrl(`/api/locations?type=regions&country_id=${countryId}`))
      .then((r) => r.json())
      .then((d) => setRegions(d.regions ?? []))
      .catch(() => {});
  }, [countryId]);
  return regions;
}

function useAllCities(countryId: number | null, regionId: number | null, refreshKey = 0) {
  const [cities, setCities] = useState<City[]>([]);
  useEffect(() => {
    if (!countryId) { setCities([]); return; }
    const params = new URLSearchParams({ type: "cities", country_id: String(countryId) });
    if (regionId) params.set("region_id", String(regionId));
    fetch(apiUrl(`/api/locations?${params}`))
      .then((r) => r.json())
      .then((d) => setCities(d.cities ?? []))
      .catch(() => {});
  }, [countryId, regionId, refreshKey]);
  return cities;
}

function CityAutocomplete({ countryId, regionId, cityId, setCityId }: {
  countryId: number | null;
  regionId: number | null;
  cityId: number | null;
  setCityId: (id: number | null) => void;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const allCities = useAllCities(countryId, regionId, refreshKey);
  const [input, setInput] = useState("");
  const [show, setShow] = useState(false);
  const [adding, setAdding] = useState(false);
  const selected = allCities.find((c) => c.id === cityId);

  useEffect(() => {
    if (selected) setInput(selected.name);
    else if (!cityId) setInput("");
  }, [selected, cityId]);

  const filtered = input
    ? allCities.filter((c) => c.name.toLowerCase().includes(input.toLowerCase()))
    : allCities;
  const isNew =
    input.trim().length > 1 &&
    !filtered.some((c) => c.name.toLowerCase() === input.trim().toLowerCase());

  async function addCity() {
    if (!countryId) return;
    setAdding(true);
    try {
      const res = await fetch(apiUrl("/api/locations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: input.trim(), country_id: countryId, region_id: regionId }),
      });
      const data = await res.json();
      if (res.ok && data.city?.id) {
        setCityId(data.city.id);
        setInput(data.city.name);
        setShow(false);
        setRefreshKey((k) => k + 1);
      } else {
        alert(data.error || "Failed to add city.");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="relative">
      <input
        id="city_autocomplete"
        className="input"
        value={input}
        onChange={(e) => { setInput(e.target.value); setShow(true); setCityId(null); }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        placeholder="City"
        autoComplete="off"
        title="City"
      />
      {show && filtered.length > 0 && (
        <ul className="absolute z-10 bg-white border w-full max-h-48 overflow-auto" style={{ borderColor: "#d4cebc" }}>
          {filtered.slice(0, 10).map((c) => (
            <li
              key={c.id}
              className="px-3 py-1.5 hover:bg-cream-mid cursor-pointer text-sm"
              style={{ color: "#0e1833" }}
              onMouseDown={() => { setCityId(c.id); setInput(c.name); setShow(false); }}
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}
      {isNew && (
        <button
          type="button"
          disabled={adding}
          onClick={addCity}
          className="text-xs mt-1 block"
          style={{ color: "#D42B2B" }}
        >
          {adding ? "Adding…" : `Add "${input.trim()}"`}
        </button>
      )}
    </div>
  );
}

export default function SubmitPage() {
  const EMPTY: FormState = {
    entityType: "", displayName: "", email: "", city_id: null, region_id: null, country_id: null,
    bio: "", ageBand: "", parentName: "", parentEmail: "", relationship: "",
    addressLine: "", postalCode: "", hours: "", contactName: "", authorizedRep: false,
    clubMeetingInfo: "", clubVenuePublic: false, venueAddressLine: "", venuePostalCode: "",
    instagram: "", youtube: "", discord: "", website: "",
    consentPrivacy: false, consentTerms: false, consentPublic: false, honeypot: "",
  };

  const [form, setForm] = useState<FormState>(EMPTY);
  const [result, setResult] = useState<{ ok: boolean; message: string; emailStatus?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const up = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const countries = useCountries();
  const regions = useRegions(form.country_id);
  const isMinor = form.entityType === "person" && form.ageBand === "13-17";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return;

    const errs: Record<string, string> = {};
    if (form.entityType === "person" && !form.ageBand) errs.ageBand = "Please select your age group.";
    if (!form.country_id) errs.country_id = "Please select a country.";
    if (!form.city_id) errs.city_id = "Please select or add a city.";
    if (!form.consentPublic) errs.consentPublic = "You must consent to public display.";
    if (!form.consentPrivacy) errs.consentPrivacy = "You must accept the privacy policy.";
    if (!form.consentTerms) errs.consentTerms = "You must agree to the terms of service.";
    if ((form.entityType === "shop" || form.entityType === "club") && !form.authorizedRep)
      errs.authorizedRep = `You must confirm you are authorized to represent this ${form.entityType}.`;
    if (form.entityType === "shop") {
      if (!form.addressLine.trim()) errs.addressLine = "Street address is required.";
      if (!form.contactName.trim()) errs.contactName = "Contact name is required.";
    }
    if (form.entityType === "club") {
      if (!form.clubMeetingInfo.trim()) errs.clubMeetingInfo = "Meeting info is required.";
      if (!form.contactName.trim()) errs.contactName = "Contact name is required.";
    }
    if (isMinor) {
      if (!form.parentName.trim()) errs.parentName = "Parent/guardian name is required.";
      if (!form.parentEmail.trim()) errs.parentEmail = "Parent/guardian email is required.";
      if (!form.relationship) errs.relationship = "Please select a relationship.";
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    const socials: Record<string, string> = {};
    if (form.instagram) socials.instagram = form.instagram.trim();
    if (form.youtube) socials.youtube = form.youtube.trim();
    if (form.discord) socials.discord = form.discord.trim();
    if (form.website) socials.website = form.website.includes("://") ? form.website : `https://${form.website}`;

    const payload = {
      entityType: form.entityType,
      displayName: form.displayName,
      email: form.email,
      city_id: form.city_id,
      region_id: form.region_id,
      country_id: form.country_id,
      bio: form.bio || undefined,
      socials: Object.keys(socials).length ? socials : undefined,
      ageBand: form.entityType === "person" ? form.ageBand : undefined,
      parentName: isMinor ? form.parentName : undefined,
      parentEmail: isMinor ? form.parentEmail : undefined,
      relationship: isMinor ? form.relationship : undefined,
      addressLine: form.entityType === "shop" ? form.addressLine : undefined,
      postalCode: form.postalCode || undefined,
      hours: form.hours || undefined,
      contactName: form.contactName || undefined,
      authorizedRep: form.authorizedRep || undefined,
      clubMeetingInfo: form.entityType === "club" ? form.clubMeetingInfo : undefined,
      clubVenuePublic: form.entityType === "club" ? form.clubVenuePublic : undefined,
      venueAddressLine: form.entityType === "club" && form.clubVenuePublic ? form.venueAddressLine : undefined,
      venuePostalCode: form.entityType === "club" && form.clubVenuePublic ? form.venuePostalCode : undefined,
      consentPrivacy: form.consentPrivacy,
      consentTerms: form.consentTerms,
      consentPublic: form.consentPublic,
      honeypot: form.honeypot || undefined,
    };

    try {
      const res = await fetch(apiUrl("/api/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || "Submission failed." });
      } else {
        setResult({ ok: true, message: data.message, emailStatus: data.emailStatus });
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl mb-4" style={{ color: "#0e1833", fontFamily: "Georgia, serif" }}>Check Your Email</h1>
        <p className="mb-6" style={{ color: "#3a4a6a" }}>{result.message}</p>
        {isMinor && (
          <p className="text-sm p-3 mb-4" style={{ backgroundColor: "#F9D0D4", color: "#0e1833" }}>
            A consent email has been sent to your parent or guardian. They must approve before your entry goes live.
          </p>
        )}
        <Link href="/" className="btn-ghost inline-block">← Back to Home</Link>
      </div>
    );
  }

  if (!form.entityType) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="eyebrow mb-2">Add to Map</p>
        <h1 className="text-4xl mb-2" style={{ color: "#0e1833", fontFamily: "Georgia, serif" }}>What are you adding?</h1>
        <p className="mb-6" style={{ color: "#3a4a6a" }}>Choose a type to continue.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {(["person", "shop", "club"] as const).map((type) => {
            const info = {
              person: { icon: "🧑", title: "Person", description: "Add yourself as a yo-yo player." },
              shop: { icon: "🏪", title: "Shop", description: "Add a yo-yo shop or retailer." },
              club: { icon: "🎲", title: "Club", description: "Add a yo-yo club or meetup group." },
            };
            return (
              <button
                key={type}
                onClick={() => up("entityType", type)}
                className="card text-left hover:border-brand-red transition-colors cursor-pointer"
                style={{ borderColor: "#d4cebc" }}
              >
                <div className="text-3xl mb-3">{info[type].icon}</div>
                <h2 className="font-bold mb-1" style={{ color: "#0e1833", fontFamily: "Georgia, serif" }}>{info[type].title}</h2>
                <p className="text-sm" style={{ color: "#3a4a6a" }}>{info[type].description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button type="button" onClick={() => up("entityType", "")} className="text-sm mb-4" style={{ color: "#D42B2B" }}>
        ← Change type
      </button>
      <h1 className="text-4xl mb-6" style={{ color: "#0e1833", fontFamily: "Georgia, serif" }}>
        Add a {form.entityType === "person" ? "Person" : form.entityType === "shop" ? "Shop" : "Club"}
      </h1>

      <form onSubmit={onSubmit} className="space-y-6">
        {result && !result.ok && (
          <div className="border-2 p-3 text-sm" style={{ borderColor: "#D42B2B", backgroundColor: "rgba(212,43,43,0.05)" }}>
            {result.message}
          </div>
        )}

        <div style={{ display: "none" }}>
          <input value={form.honeypot} onChange={(e) => up("honeypot", e.target.value)} aria-label="Leave blank" title="Leave blank" placeholder="Leave blank" />
        </div>

        <div className="card space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input className="input" required value={form.displayName} onChange={(e) => up("displayName", e.target.value)} title="Display name" />
          </div>
          <div>
            <label className="label">Your Email</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => up("email", e.target.value)} title="Email address" />
          </div>
          {form.entityType === "person" && (
            <div>
              <label className="label">Age Group</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="ageBand" checked={form.ageBand === "18+"} onChange={() => up("ageBand", "18+")} />
                  18 or older
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="ageBand" checked={form.ageBand === "13-17"} onChange={() => up("ageBand", "13-17")} />
                  13–17
                </label>
              </div>
              {errors.ageBand && <p className="text-xs mt-1" style={{ color: "#D42B2B" }}>{errors.ageBand}</p>}
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <div>
            <label className="label">Country</label>
            <select
              className="input"
              value={form.country_id ?? ""}
              onChange={(e) => { up("country_id", e.target.value ? Number(e.target.value) : null); up("region_id", null); up("city_id", null); }}
              required
              title="Country"
            >
              <option value="">Select country</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.country_id && <p className="text-xs mt-1" style={{ color: "#D42B2B" }}>{errors.country_id}</p>}
          </div>
          {regions.length > 0 && (
            <div>
              <label className="label">Region (optional)</label>
              <select
                className="input"
                value={form.region_id ?? ""}
                onChange={(e) => { up("region_id", e.target.value ? Number(e.target.value) : null); up("city_id", null); }}
                title="Region"
              >
                <option value="">Select region (optional)</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">City</label>
            <CityAutocomplete
              countryId={form.country_id}
              regionId={form.region_id}
              cityId={form.city_id}
              setCityId={(id) => { up("city_id", id); if (id) setErrors((e) => { const n = { ...e }; delete n.city_id; return n; }); }}
            />
            {errors.city_id && <p className="text-xs mt-1" style={{ color: "#D42B2B" }}>{errors.city_id}</p>}
          </div>
        </div>

        {isMinor && (
          <div className="card space-y-4" style={{ backgroundColor: "#F9D0D4" }}>
            <h2 className="text-xl" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Parent / Guardian Information</h2>
            <div>
              <label className="label">Parent / Guardian Name</label>
              <input className="input" value={form.parentName} onChange={(e) => up("parentName", e.target.value)} title="Parent name" />
              {errors.parentName && <p className="text-xs mt-1" style={{ color: "#D42B2B" }}>{errors.parentName}</p>}
            </div>
            <div>
              <label className="label">Parent / Guardian Email</label>
              <input className="input" type="email" value={form.parentEmail} onChange={(e) => up("parentEmail", e.target.value)} title="Parent email" />
              {errors.parentEmail && <p className="text-xs mt-1" style={{ color: "#D42B2B" }}>{errors.parentEmail}</p>}
            </div>
            <div>
              <label className="label">Relationship</label>
              <select className="input" value={form.relationship} onChange={(e) => up("relationship", e.target.value as "" | "parent" | "legal guardian")} title="Relationship">
                <option value="">Select relationship</option>
                <option value="parent">Parent</option>
                <option value="legal guardian">Legal Guardian</option>
              </select>
              {errors.relationship && <p className="text-xs mt-1" style={{ color: "#D42B2B" }}>{errors.relationship}</p>}
            </div>
          </div>
        )}

        {form.entityType === "shop" && (
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: "#0e1833" }}>Shop Details</h2>
            <div>
              <label className="label">Contact Name</label>
              <input className="input" value={form.contactName} onChange={(e) => up("contactName", e.target.value)} title="Contact name" />
              {errors.contactName && <p className="text-xs mt-1" style={{ color: "#D42B2B" }}>{errors.contactName}</p>}
            </div>
            <div>
              <label className="label">Street Address</label>
              <input className="input" value={form.addressLine} onChange={(e) => up("addressLine", e.target.value)} title="Street address" />
              {errors.addressLine && <p className="text-xs mt-1" style={{ color: "#D42B2B" }}>{errors.addressLine}</p>}
            </div>
            <div>
              <label className="label">Postal / ZIP Code</label>
              <input className="input" value={form.postalCode} onChange={(e) => up("postalCode", e.target.value)} title="Postal code" />
            </div>
            <div>
              <label className="label">Business Hours</label>
              <textarea className="input" rows={3} placeholder="e.g. Mon–Fri 10am–6pm, Sat 11am–4pm" value={form.hours} onChange={(e) => up("hours", e.target.value)} title="Business hours" />
            </div>
          </div>
        )}

        {form.entityType === "club" && (
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: "#0e1833" }}>Club Details</h2>
            <div>
              <label className="label">Contact Name</label>
              <input className="input" value={form.contactName} onChange={(e) => up("contactName", e.target.value)} title="Contact name" />
              {errors.contactName && <p className="text-xs mt-1" style={{ color: "#D42B2B" }}>{errors.contactName}</p>}
            </div>
            <div>
              <label className="label">Meeting Schedule &amp; Info</label>
              <textarea className="input" rows={4} placeholder="When, where, and how often you meet" value={form.clubMeetingInfo} onChange={(e) => up("clubMeetingInfo", e.target.value)} title="Meeting info" />
              {errors.clubMeetingInfo && <p className="text-xs mt-1" style={{ color: "#D42B2B" }}>{errors.clubMeetingInfo}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.clubVenuePublic} onChange={(e) => up("clubVenuePublic", e.target.checked)} />
              Share venue address publicly on the map
            </label>
            {form.clubVenuePublic && (
              <div className="space-y-3 pl-4 border-l-2" style={{ borderColor: "rgba(212,43,43,0.3)" }}>
                <div>
                  <label className="label">Venue Street Address</label>
                  <input className="input" value={form.venueAddressLine} onChange={(e) => up("venueAddressLine", e.target.value)} title="Venue address" />
                </div>
                <div>
                  <label className="label">Venue Postal / ZIP Code</label>
                  <input className="input" value={form.venuePostalCode} onChange={(e) => up("venuePostalCode", e.target.value)} title="Venue postal code" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="card space-y-4">
          <div>
            <label className="label">Bio (optional)</label>
            <textarea className="input" rows={3} maxLength={280} placeholder="Tell us a bit about yourself or your organization" value={form.bio} onChange={(e) => up("bio", e.target.value)} title="Bio" />
          </div>
          <div>
            <label className="label">Social Links (optional)</label>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Instagram" value={form.instagram} onChange={(e) => up("instagram", e.target.value)} title="Instagram" />
              <input className="input" placeholder="YouTube" value={form.youtube} onChange={(e) => up("youtube", e.target.value)} title="YouTube" />
              <input className="input" placeholder="Discord" value={form.discord} onChange={(e) => up("discord", e.target.value)} title="Discord" />
              <input className="input" placeholder="Website URL" value={form.website} onChange={(e) => up("website", e.target.value)} title="Website" />
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          {(form.entityType === "shop" || form.entityType === "club") && (
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={form.authorizedRep} onChange={(e) => up("authorizedRep", e.target.checked)} />
              <span>I am authorized to represent this {form.entityType === "shop" ? "business" : "club"}.</span>
            </label>
          )}
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={form.consentPublic} onChange={(e) => up("consentPublic", e.target.checked)} />
            <span>I consent to my information being publicly displayed on the map.</span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={form.consentPrivacy} onChange={(e) => up("consentPrivacy", e.target.checked)} />
            <span>I have read and accept the <Link href="/legal/privacy" className="underline" style={{ color: "#D42B2B" }}>Privacy Policy</Link>.</span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={form.consentTerms} onChange={(e) => up("consentTerms", e.target.checked)} />
            <span>I agree to the <Link href="/legal/terms" className="underline" style={{ color: "#D42B2B" }}>Terms of Service</Link>.</span>
          </label>
          {(errors.consentPublic || errors.consentPrivacy || errors.consentTerms || errors.authorizedRep) && (
            <p className="text-xs" style={{ color: "#D42B2B" }}>
              {errors.consentPublic || errors.consentPrivacy || errors.consentTerms || errors.authorizedRep}
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
