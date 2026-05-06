import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { apiUrl } from "../lib/api";

interface Entry {
  id: string;
  display_name: string;
  city: string;
  region: string | null;
  country: string;
  bio: string | null;
  socials: Record<string, string>;
  entity_type: "person" | "shop" | "club";
  club_meeting_info: string | null;
  club_venue_public: boolean | null;
  contact_name: string | null;
  address_line: string | null;
  postal_code: string | null;
  hours: string | null;
}

function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/auth/magic-link"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const d = await res.json();
        setError(d.error || "Something went wrong.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-2xl mb-3 font-display text-navy-deep">Check your email</h2>
        <p className="text-text-body">We sent you a magic link. Click it to manage your map entry.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-2xl mb-2 font-display text-navy-deep">Manage Your Entry</h2>
      <p className="text-sm mb-6 text-text-body">Enter your email to receive a magic link and manage your listing.</p>
      <form onSubmit={send} className="space-y-4">
        <div>
          <label className="label" htmlFor="profile-email">Email address</label>
          <input
            id="profile-email"
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            title="Your email address"
          />
        </div>
        {error && <p className="text-sm text-brand-red">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={sending}>
          {sending ? "Sending…" : "Send Magic Link"}
        </button>
      </form>
    </div>
  );
}

function EditForm({ token }: { token: string }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    fetch(apiUrl(`/api/auth/verify-link?token=${encodeURIComponent(token)}`))
      .then((r) => r.json())
      .then((d) => {
        if (d.entry) setEntry(d.entry);
        else setError(d.error || "Invalid or expired link.");
      })
      .catch(() => setError("Failed to load entry."))
      .finally(() => setLoading(false));
  }, [token]);

  async function save() {
    if (!entry) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(apiUrl("/api/profile/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...entry }),
      });
      const d = await res.json();
      if (res.ok) setMessage("Saved.");
      else setError(d.error || "Save failed.");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(apiUrl("/api/profile/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) setDeleted(true);
      else {
        const d = await res.json();
        setError(d.error || "Delete failed.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="card py-12 text-center text-text-muted">Loading your entry…</div>;
  if (deleted) return (
    <div className="card text-center py-12">
      <p className="mb-4 font-display text-navy-deep">Your entry has been permanently deleted.</p>
      <Link href="/" className="btn-ghost inline-block">Back to Home</Link>
    </div>
  );
  if (!entry) return <div className="card py-12 text-center text-brand-red">{error || "Entry not found."}</div>;

  return (
    <div>
      <h1 className="text-4xl mb-2 font-display text-navy-deep">Edit Your Entry</h1>
      <p className="text-sm mb-6 text-text-body">Changes save when you click the button below.</p>

      <div className="card space-y-4 mb-6">
        <div>
          <label className="label">Display Name</label>
          <input className="input" value={entry.display_name} onChange={(e) => setEntry({ ...entry, display_name: e.target.value })} title="Display name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">City</label>
            <input className="input" value={entry.city} onChange={(e) => setEntry({ ...entry, city: e.target.value })} title="City" />
          </div>
          <div>
            <label className="label">Region</label>
            <input className="input" value={entry.region || ""} onChange={(e) => setEntry({ ...entry, region: e.target.value })} title="Region" />
          </div>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea className="input" rows={3} maxLength={280} value={entry.bio || ""} onChange={(e) => setEntry({ ...entry, bio: e.target.value })} title="Bio" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Instagram", "instagram"],
            ["YouTube", "youtube"],
            ["Discord", "discord"],
            ["Website", "website"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                className="input"
                value={entry.socials?.[key] || ""}
                onChange={(e) => setEntry({ ...entry, socials: { ...entry.socials, [key]: e.target.value } })}
                title={label}
              />
            </div>
          ))}
        </div>

        {entry.entity_type === "shop" && (
          <>
            <hr className="border-navy/10" />
            <p className="text-sm font-semibold uppercase tracking-wide text-navy-deep">🏠 Shop Details</p>
            {[
              ["Contact Name", "contact_name"],
              ["Street Address", "address_line"],
              ["Postal / ZIP Code", "postal_code"],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input className="input" value={(entry as unknown as Record<string, string>)[key] || ""} onChange={(e) => setEntry({ ...entry, [key]: e.target.value })} title={label} />
              </div>
            ))}
            <div>
              <label className="label">Business Hours</label>
              <textarea className="input" rows={3} value={entry.hours || ""} onChange={(e) => setEntry({ ...entry, hours: e.target.value })} title="Business hours" />
            </div>
          </>
        )}

        {entry.entity_type === "club" && (
          <>
            <hr className="border-navy/10" />
            <p className="text-sm font-semibold uppercase tracking-wide text-navy-deep">🏐 Club Details</p>
            <div>
              <label className="label">Contact Name</label>
              <input className="input" value={entry.contact_name || ""} onChange={(e) => setEntry({ ...entry, contact_name: e.target.value })} title="Contact name" />
            </div>
            <div>
              <label className="label">Meeting Schedule &amp; Info</label>
              <textarea className="input" rows={4} value={entry.club_meeting_info || ""} onChange={(e) => setEntry({ ...entry, club_meeting_info: e.target.value })} title="Meeting info" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!entry.club_venue_public} onChange={(e) => setEntry({ ...entry, club_venue_public: e.target.checked })} />
              Share venue address publicly
            </label>
            {entry.club_venue_public && (
              <div className="space-y-3 pl-4 border-l-2 border-brand-red/30">
                <div>
                  <label className="label">Venue Street Address</label>
                  <input className="input" value={entry.address_line || ""} onChange={(e) => setEntry({ ...entry, address_line: e.target.value })} title="Venue address" />
                </div>
                <div>
                  <label className="label">Venue Postal / ZIP Code</label>
                  <input className="input" value={entry.postal_code || ""} onChange={(e) => setEntry({ ...entry, postal_code: e.target.value })} title="Venue postal code" />
                </div>
              </div>
            )}
          </>
        )}

        {message && <div className="p-3 text-sm border-2 border-green-500 bg-green-500/5 text-green-700">{message}</div>}
        {error && <div className="p-3 text-sm border-2 border-brand-red bg-brand-red/5 text-brand-red">{error}</div>}
        <button className="btn-primary w-full" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className="card border-brand-red bg-brand-red/3">
        <h2 className="text-xl mb-2 font-display text-navy-deep">Delete your entry</h2>
        <p className="text-sm mb-4 text-text-body">
          Permanently remove your entry. This cannot be undone. Your email and any consent records are also deleted.
        </p>
        {!confirmDelete ? (
          <button
            className="btn-ghost border-brand-red text-brand-red"
            onClick={() => setConfirmDelete(true)}
          >
            Delete My Entry
          </button>
        ) : (
          <div className="flex gap-3">
            <button className="btn-primary" disabled={deleting} onClick={remove}>
              {deleting ? "Deleting…" : "Yes, delete permanently"}
            </button>
            <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {token ? <EditForm token={token} /> : <MagicLinkForm />}
    </div>
  );
}
