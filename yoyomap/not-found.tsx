import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center p-8">
      <h1 className="text-4xl font-bold mb-4">404 – Page Not Found</h1>
      <p className="mb-6">Sorry, the page you’re looking for doesn’t exist.</p>
      <Link href="/" className="text-blue-600 underline">Return to Home</Link>
    </main>
  );
}
