import { Link } from "wouter";

export default function SecurityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <p className="eyebrow mb-2">Legal</p>
      <h1 className="text-4xl mb-2 font-display text-navy-deep">Security</h1>
      <p className="mb-6 text-text-body">Security information and vulnerability disclosures for YoYo Map.</p>

      <div className="space-y-6">
        <div className="card">
          <h2 className="text-xl mb-3 font-display text-navy-deep">Reporting a Vulnerability</h2>
          <p className="text-sm text-text-body">
            To report a security vulnerability, please email{" "}
            <a href="mailto:contact@dmvthrowers.club" className="underline text-brand-red">contact@dmvthrowers.club</a>{" "}
            with a description of the issue. We will respond within 72 hours.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl mb-3 font-display text-navy-deep">Security Bulletins</h2>
          <p className="text-sm text-text-muted">No active security bulletins at this time.</p>
        </div>

        <div className="card">
          <h2 className="text-xl mb-3 font-display text-navy-deep">Privacy Protections</h2>
          <ul className="text-sm list-disc pl-6 space-y-2 text-text-body">
            <li>All connections are encrypted via HTTPS</li>
            <li>Location pins are jittered ~10 miles from exact location</li>
            <li>Email addresses are never publicly displayed</li>
            <li>Verification tokens are hashed and time-limited</li>
            <li>Magic links expire after 1 hour</li>
            <li>Parent consent tokens expire after 7 days</li>
          </ul>
        </div>
      </div>

      <div className="mt-10">
        <Link href="/" className="btn-ghost inline-block">← Home</Link>
      </div>
    </div>
  );
}
