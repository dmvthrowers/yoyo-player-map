import { Link } from "wouter";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <p className="eyebrow mb-2">Legal</p>
      <h1 className="text-4xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Terms of Service</h1>
      <p className="text-sm mb-8" style={{ color: "#6a7a9a" }}>Effective Date: January 1, 2024</p>

      <div className="prose prose-sm max-w-none space-y-6" style={{ color: "#3a4a6a" }}>
        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Acceptance</h2>
          <p>By using YoYo Map, you agree to these terms.</p>
        </section>
        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Description</h2>
          <p>YoYo Map is a community map for finding yo-yo players, shops, and clubs.</p>
        </section>
        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Submit false or misleading information</li>
            <li>Harass or abuse other users</li>
            <li>Attempt to access others&apos; data</li>
            <li>Use the service for illegal purposes</li>
            <li>Spam or advertise without permission</li>
            <li>Interfere with service operation</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Disclaimer</h2>
          <p>The service is provided &quot;as is&quot; without warranties of any kind.</p>
        </section>
        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Limitation of Liability</h2>
          <p>We are not liable for damages arising from use of the service.</p>
        </section>
        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Governing Law</h2>
          <p>These terms are governed by Virginia law.</p>
        </section>
        <section>
          <h2 className="text-xl mb-2" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Contact</h2>
          <p>Questions? Email <a href="mailto:contact@dmvthrowers.club" className="underline" style={{ color: "#D42B2B" }}>contact@dmvthrowers.club</a></p>
        </section>
      </div>

      <div className="mt-10 flex gap-4">
        <Link href="/" className="btn-ghost inline-block">← Home</Link>
        <Link href="/legal/privacy" className="btn-ghost inline-block">Privacy Policy</Link>
      </div>
    </div>
  );
}
