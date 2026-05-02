import { Link } from "wouter";

export default function ContactPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <p className="eyebrow mb-2">Get in Touch</p>
      <h1 className="text-4xl mb-4" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Contact Us</h1>
      <p className="mb-8" style={{ color: "#3a4a6a" }}>
        We&apos;d love to hear from you! Reach out with questions, suggestions, or club inquiries.
      </p>

      <ul className="space-y-3 text-sm">
        <li>
          <span className="font-semibold">Email (Club): </span>
          <a href="mailto:contact@dmvthrowers.club" className="underline hover:opacity-80" style={{ color: "#D42B2B" }}>
            contact@dmvthrowers.club
          </a>
        </li>
        <li>
          <span className="font-semibold">Email (Contest): </span>
          <a href="mailto:vastateyoyocontest@gmail.com" className="underline hover:opacity-80" style={{ color: "#D42B2B" }}>
            vastateyoyocontest@gmail.com
          </a>
        </li>
        <li>
          <span className="font-semibold">Instagram: </span>
          <a
            href="https://instagram.com/dmv_throwers"
            className="underline hover:opacity-80"
            style={{ color: "#D42B2B" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            @dmv_throwers
          </a>
        </li>
        <li>
          <span className="font-semibold">Phone: </span>
          <a href="tel:850-284-1613" className="underline hover:opacity-80" style={{ color: "#D42B2B" }}>
            850-284-1613
          </a>
        </li>
        <li>
          <span className="font-semibold">Coordinator: </span>
          Brandon Rogers
        </li>
      </ul>

      <div className="mt-10">
        <Link href="/" className="btn-ghost inline-block">← Back to Home</Link>
      </div>
    </div>
  );
}
