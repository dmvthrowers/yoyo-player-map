import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — YoYo Map',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8 p-4 bg-cherry-pink border-2 border-brand-red text-sm">
        <strong>⚠ DRAFT — not legally reviewed.</strong> These terms were drafted as a starting point. Before launch, DMV Throwers should have a lawyer review and adapt them. Last updated: April 2026.
      </div>

      <h1 className="text-4xl mb-2">Terms of Service</h1>
      <p className="text-navy/70 mb-8">Effective date: [DATE]</p>

      <h2 className="text-2xl mt-8 mb-3">1. Acceptance</h2>
      <p>
        By submitting an entry to YoYo Map (the &quot;service&quot;), you agree to these Terms of Service. If you don&apos;t agree, don&apos;t use the service. The service is operated by DMV Throwers Yo-Yo &amp; Skill Toy Club.
      </p>

      <h2 className="text-2xl mt-8 mb-3">2. Eligibility</h2>
      <p>
        You must be at least 13 years old to submit an entry. If you are under 18, you must have a parent or legal guardian&apos;s consent, which we verify by email. Parents and guardians may withdraw consent at any time, which will result in the associated entry being deleted.
      </p>

      <h2 className="text-2xl mt-8 mb-3">3. Your entry</h2>
      <p>You are responsible for the content of your entry. You agree:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>To provide accurate information about yourself.</li>
        <li>Not to impersonate anyone else.</li>
        <li>Not to post content that is unlawful, harassing, threatening, sexually explicit, hateful, or that promotes violence.</li>
        <li>Not to use the service to stalk, harass, or endanger anyone, especially minors.</li>
        <li>Not to include any third party&apos;s personal information without their consent.</li>
        <li>Not to use the service for commercial advertising unrelated to yo-yoing.</li>
      </ul>

      <h2 className="text-2xl mt-8 mb-3">4. Our rights</h2>
      <p>
        We may remove any entry at any time for any reason, including because it violates these terms, because we received a credible report, or at our discretion. We will try to notify you if we do, but we are not required to.
      </p>

      <h2 className="text-2xl mt-8 mb-3">5. No messaging</h2>
      <p>
        The service does not provide a direct-message or contact feature. Any communication between users happens outside the service, through whatever social channels users choose to share. DMV Throwers is not responsible for interactions that happen outside YoYo Map.
      </p>

      <h2 className="text-2xl mt-8 mb-3">6. Location accuracy</h2>
      <p>
        We intentionally blur locations by up to 10 miles. The pin on the map is not your real location and should not be used for any purpose that requires precise location data.
      </p>

      <h2 className="text-2xl mt-8 mb-3">7. Reporting abuse</h2>
      <p>
        If you see content that violates these terms or endangers anyone, report it using the &quot;Report this pin&quot; link on any entry, or email dmvthrowers@gmail.com. Reports involving minor safety or harassment trigger automatic hiding of the entry pending review.
      </p>

      <h2 className="text-2xl mt-8 mb-3">8. Intellectual property</h2>
      <p>
        You keep ownership of what you submit. By submitting an entry, you grant DMV Throwers a non-exclusive, worldwide, royalty-free license to display it on YoYo Map for as long as you maintain the entry. Deleting your entry revokes the license.
      </p>

      <h2 className="text-2xl mt-8 mb-3">9. Disclaimer</h2>
      <p>
        The service is provided &quot;as is&quot; without any warranties. We don&apos;t guarantee it will always be available, bug-free, or that every entry is accurate. Use common sense when connecting with strangers through the site.
      </p>

      <h2 className="text-2xl mt-8 mb-3">10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, DMV Throwers is not liable for indirect or consequential damages arising from your use of the service. Our total liability is limited to $100 or the amount you paid us to use the service (which is zero), whichever is greater.
      </p>

      <h2 className="text-2xl mt-8 mb-3">11. Safety reminder</h2>
      <p>
        YoYo Map helps yo-yoers find each other but we cannot verify anyone&apos;s identity. Meet in public places, bring a friend, and use good judgment. Parents of minor users should discuss online safety before the first meetup.
      </p>

      <h2 className="text-2xl mt-8 mb-3">12. Changes to these terms</h2>
      <p>
        We may update these terms. If we make material changes we&apos;ll update the effective date above and email active users about significant changes.
      </p>

      <h2 className="text-2xl mt-8 mb-3">13. Governing law</h2>
      <p>
        These terms are governed by the laws of the Commonwealth of Virginia, without regard to its conflict of laws rules.
      </p>

      <h2 className="text-2xl mt-8 mb-3">14. Contact</h2>
      <p>
        Questions? Email dmvthrowers@gmail.com.
      </p>

      <div className="mt-12 p-4 bg-navy/5 border-l-4 border-navy text-sm">
        <strong>Back to:</strong> <Link href="/" className="text-brand-red underline">Home</Link> · <Link href="/legal/privacy" className="text-brand-red underline">Privacy Policy</Link>
      </div>
    </div>
  );
}
