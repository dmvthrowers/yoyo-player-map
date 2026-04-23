import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p className="mb-6">We’d love to hear from you! Reach out with questions, suggestions, or club inquiries.</p>
      <ul className="space-y-2">
        <li><strong>Email (Club):</strong> <a href="mailto:contact@dmvthrowers.club" className="text-blue-600 underline">contact@dmvthrowers.club</a></li>
        <li><strong>Email (Contest):</strong> <a href="mailto:vastateyoyocontest@gmail.com" className="text-blue-600 underline">vastateyoyocontest@gmail.com</a></li>
        <li><strong>Instagram:</strong> <a href="https://instagram.com/dmv_throwers" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">@dmv_throwers</a></li>
        <li><strong>Phone:</strong> <a href="tel:850-284-1613" className="text-blue-600 underline">850-284-1613</a></li>
        <li><strong>Coordinator:</strong> Brandon Rogers</li>
      </ul>
      <div className="mt-8">
        <Link href="/" className="text-blue-600 underline">Back to Home</Link>
      </div>
    </main>
  );
}
