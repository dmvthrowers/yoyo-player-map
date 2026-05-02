import { Link } from "wouter";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <p className="eyebrow mb-2">Legal</p>
      <h1 className="text-4xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Privacy Policy</h1>
      <p className="text-sm mb-8" style={{ color: "#6a7a9a" }}>Effective Date: January 1, 2024</p>

      <div className="prose prose-sm max-w-none space-y-6" style={{ color: "#3a4a6a" }}>
        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Overview</h2>
          <p>YoYo Map is committed to protecting your privacy. This policy explains how we collect, use, and protect your information.</p>
        </section>

        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Data You Provide</h2>
          <p>When you submit to the map, you may provide:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Display name</li>
            <li>City (approximate location)</li>
            <li>Bio or description</li>
            <li>Social media links</li>
            <li>Entity type (player, shop, or club)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Display your pin on the map</li>
            <li>Allow others to find and connect with you</li>
            <li>Improve the service</li>
            <li>Respond to your requests</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Data Sharing</h2>
          <p>We do not sell or rent your personal information.</p>
        </section>

        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Data Retention &amp; Deletion</h2>
          <p>We retain your data until you request deletion. You can request deletion at any time via the Profile page. Deletion requests are processed immediately.</p>
        </section>

        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Security</h2>
          <p>We implement reasonable security measures including encrypted connections, hashed tokens, and city-level location obfuscation.</p>
        </section>

        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Third Party Services</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Replit (hosting)</li>
            <li>Replit PostgreSQL (database)</li>
            <li>OpenStreetMap / Nominatim (mapping and geocoding)</li>
            <li>Resend (email delivery)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Children&apos;s Privacy</h2>
          <p>Users aged 13–17 require parent or guardian consent before their entry is published. We do not knowingly accept entries from users under 13.</p>
        </section>

        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Contact</h2>
          <p>Questions? Email <a href="mailto:contact@dmvthrowers.club" className="underline" style={{ color: "#D42B2B" }}>contact@dmvthrowers.club</a></p>
        </section>
      </div>

      <div className="mt-10 flex gap-4">
        <Link href="/" className="btn-ghost inline-block">← Home</Link>
        <Link href="/legal/terms" className="btn-ghost inline-block">Terms →</Link>
      </div>
    </div>
  );
}
