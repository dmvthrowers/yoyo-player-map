import { Link } from "wouter";

export default function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="eyebrow mb-4">404</p>
      <h1 className="text-5xl mb-4" style={{ fontFamily: "Georgia, serif", color: "#0e1833" }}>Page Not Found</h1>
      <p className="mb-8" style={{ color: "#3a4a6a" }}>The page you're looking for doesn't exist.</p>
      <Link href="/" className="btn-primary inline-block">Back to Home</Link>
    </div>
  );
}
