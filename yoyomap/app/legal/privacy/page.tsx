import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — YoYo Map',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose-styles">
      <h1 className="text-4xl mb-2">Privacy Policy</h1>
      <p className="text-navy/70 mb-8">Effective date: April 20, 2026</p>

      <h2 className="text-2xl mt-8 mb-3">Who we are</h2>
      <p>
        YoYo Map is operated by DMV Throwers Yo-Yo &amp; Skill Toy Club (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), a community yo-yo club operating in the DC, Maryland, and Virginia region. EIN 41-4879324. You can reach us at dmvthrowers@gmail.com.
      </p>

      <h2 className="text-2xl mt-8 mb-3">What this policy covers</h2>
      <p>
        This policy describes how we collect, use, and protect information when you use the YoYo Map website at map.dmvthrowers.club. It does not cover other DMV Throwers websites or services.
      </p>

      <h2 className="text-2xl mt-8 mb-3">What we collect</h2>
      <h3 className="text-lg mt-4 mb-2 font-semibold">Information you give us</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Display name (public)</li>
        <li>City, region, and country (public)</li>
        <li>Short bio and social media handles you choose to share (public)</li>
        <li>Email address (private — never public)</li>
        <li>Age band: &quot;13–17&quot; or &quot;18+&quot; (private)</li>
        <li>If under 18: parent or guardian name, email, and relationship (private)</li>
      </ul>

      <h3 className="text-lg mt-4 mb-2 font-semibold">Information we collect automatically</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li>IP address, used only for rate limiting and fraud prevention. Stored for up to 90 days in our audit log.</li>
        <li>User-agent string, stored with parent consent records as an audit trail.</li>
      </ul>
      <p className="mt-2">We do not use advertising cookies, analytics trackers, or fingerprinting.</p>

      <h3 className="text-lg mt-4 mb-2 font-semibold">Location</h3>
      <p>
        We never ask for or store your exact location. We geocode the city or town you type in to get an approximate center point, then we randomly shift (&quot;jitter&quot;) that point by up to 10 miles before storing it. Your displayed pin is not where you live.
      </p>

      <h2 className="text-2xl mt-8 mb-3">How we use your information</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>To show your public entry on the map</li>
        <li>To send transactional emails (verification, parent consent, magic login link)</li>
        <li>To enforce rate limits and prevent abuse</li>
        <li>To comply with legal obligations</li>
      </ul>
      <p className="mt-2">We do not use your information for advertising, do not sell it, and do not share it with third parties for their own purposes.</p>

      <h2 className="text-2xl mt-8 mb-3">Who we share information with</h2>
      <p>We use these service providers (&quot;sub-processors&quot;) to run the site:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Supabase</strong> — database and infrastructure</li>
        <li><strong>Vercel</strong> — web hosting</li>
        <li><strong>Resend</strong> — transactional email delivery</li>
        <li><strong>OpenStreetMap / Nominatim</strong> — geocoding (we only send the city name you typed, no personal data)</li>
      </ul>
      <p className="mt-2">We do not share your data with anyone else unless legally required (for example, a valid court order).</p>

      <h2 className="text-2xl mt-8 mb-3">Children&apos;s privacy (COPPA)</h2>
      <p>
        The YoYo Map is not for children under 13. We do not knowingly collect personal information from children under 13. If you are under 13, please do not submit an entry.
      </p>
      <p>
        For users aged 13 to 17, we require verifiable parental consent before publishing their entry. The parent or guardian receives an email with a consent link. No entry is published without that consent. A parent or guardian can withdraw consent at any time by emailing dmvthrowers@gmail.com or by using the magic-link flow on the Manage Entry page, and we will remove the entry.
      </p>
      <p>
        If you believe we have accidentally collected information from a child under 13, contact us at dmvthrowers@gmail.com and we will delete it promptly.
      </p>

      <h2 className="text-2xl mt-8 mb-3">Your rights</h2>

      <h3 className="text-lg mt-4 mb-2 font-semibold">Everyone</h3>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Access and correction:</strong> Use the <Link href="/profile" className="text-brand-red underline">Manage Entry</Link> page to view and edit your information.</li>
        <li><strong>Deletion:</strong> Use the Manage Entry page to permanently delete your entry and related data. You can also email us.</li>
        <li><strong>Complaints:</strong> Email dmvthrowers@gmail.com.</li>
      </ul>

      <h3 className="text-lg mt-4 mb-2 font-semibold">If you are in the EU, UK, or another GDPR region</h3>
      <p>
        Under the GDPR you have rights to access, correct, delete, restrict, port, and object to processing of your personal data. Our legal basis for processing is <em>consent</em> (you opted in) and <em>legitimate interest</em> (preventing abuse). You can withdraw consent at any time by deleting your entry. You may also lodge a complaint with your local data protection authority.
      </p>

      <h3 className="text-lg mt-4 mb-2 font-semibold">If you are in California</h3>
      <p>
        Under the CCPA/CPRA you have the right to know what personal information we have, to request deletion, and to opt out of sale or sharing. We do not sell or share personal information. To exercise any right, email dmvthrowers@gmail.com or use the Manage Entry page.
      </p>

      <h3 className="text-lg mt-4 mb-2 font-semibold">If you are in Virginia</h3>
      <p>
        Under the VCDPA you have substantially similar rights. We do not use personal data for targeted advertising, sale, or profiling.
      </p>

      <h2 className="text-2xl mt-8 mb-3">How long we keep your data</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Entry data: until you delete it.</li>
        <li>Parent consent records: 3 years after the associated entry is deleted, to preserve audit trail.</li>
        <li>Audit logs: 90 days.</li>
        <li>Verification tokens: until used or 24 hours (7 days for consent links), whichever comes first.</li>
      </ul>

      <h2 className="text-2xl mt-8 mb-3">Security</h2>
      <p>
        We encrypt data in transit (HTTPS) and at rest. Row-Level Security policies in our database restrict who can read what. We will notify affected users within 72 hours of discovering a breach that affects them.
      </p>

      <h2 className="text-2xl mt-8 mb-3">International transfers</h2>
      <p>
        Our servers are operated by Supabase and Vercel, primarily in the United States. If you submit from outside the US, your data will be transferred to and processed in the US.
      </p>

      <h2 className="text-2xl mt-8 mb-3">Changes to this policy</h2>
      <p>
        If we make material changes we will update the effective date at the top of this page. If you have an active entry, we will email you about significant changes.
      </p>

      <h2 className="text-2xl mt-8 mb-3">Contact</h2>
      <p>
        Email: dmvthrowers@gmail.com<br />
        DMV Throwers Yo-Yo &amp; Skill Toy Club<br />
        EIN 41-4879324
      </p>

      <div className="mt-12 p-4 bg-navy/5 border-l-4 border-navy text-sm">
        <strong>Back to:</strong> <Link href="/" className="text-brand-red underline">Home</Link> · <Link href="/legal/terms" className="text-brand-red underline">Terms of Service</Link>
      </div>
    </div>
  );
}
