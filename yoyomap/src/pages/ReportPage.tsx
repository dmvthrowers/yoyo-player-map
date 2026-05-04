import { useState } from "react";
import { Link, useSearch } from "wouter";
import { apiUrl } from "../lib/api";

const REASONS = [
  { value: "spam", label: "Spam or fake" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "impersonation", label: "Impersonation" },
  { value: "minor_unsafe", label: "Minor safety concern" },
  { value: "fake_business", label: "Fake or fraudulent business" },
  { value: "unauthorized_listing", label: "Unauthorized listing" },
  { value: "other", label: "Other" },
];

export default function ReportPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const entryId = params.get("id") ?? "";

  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, reason, details, reporterEmail: email }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const d = await res.json();
        setError(d.error || "Failed to submit.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="card text-center">
          <h1 className="text-3xl mb-4" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Thanks for letting us know</h1>
          <p className="mb-6" style={{ color: "#3a4a6a" }}>
            We review every report. The entry will be hidden immediately while we investigate if the report involves safety concerns.
          </p>
          <Link href="/map" className="btn-ghost inline-block">Back to map</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <form onSubmit={submit} className="card space-y-4">
        <h1 className="text-3xl" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Report an Entry</h1>
        <p className="text-sm" style={{ color: "#6a7a9a" }}>
          If an entry on the map is unsafe, inaccurate, or inappropriate, tell us here.
        </p>

        <div>
          <label className="label">What&apos;s wrong?</label>
          <select className="input" required value={reason} onChange={(e) => setReason(e.target.value)} title="Reason for report">
            <option value="">Select a reason</option>
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Details (optional)</label>
          <textarea
            className="input"
            rows={4}
            maxLength={1000}
            placeholder="Please describe the issue…"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            title="Details"
          />
        </div>

        <div>
          <label className="label">Your email (optional)</label>
          <input
            className="input"
            type="email"
            placeholder="So we can follow up if needed"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            title="Your email"
          />
        </div>

        {error && <p className="text-sm" style={{ color: "#D42B2B" }}>{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Submitting…" : "Submit Report"}
        </button>

        <div className="text-center">
          <Link href="/map" className="text-sm underline" style={{ color: "#6a7a9a" }}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
