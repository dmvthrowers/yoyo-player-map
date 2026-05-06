import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { apiUrl } from "../lib/api";

type Status = "loading" | "ok" | "pending_consent" | "error";

interface VerifyResult {
  ok: boolean;
  pendingConsent?: boolean;
  message?: string;
  error?: string;
}

export default function VerifyPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type") ?? "entry";
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link. Please check the email and try again.");
      return;
    }

    const url = apiUrl(`/api/verify?type=${encodeURIComponent(type)}&token=${encodeURIComponent(token)}`);
    fetch(url)
      .then((r) => r.json() as Promise<VerifyResult>)
      .then((data) => {
        if (data.pendingConsent) {
          setStatus("pending_consent");
          setMessage(data.message ?? "Email verified. Waiting for parental consent.");
        } else if (data.ok) {
          setStatus("ok");
          setMessage(data.message ?? "Verified!");
        } else {
          setStatus("error");
          setMessage(data.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Unable to reach the server. Please try again later.");
      });
  }, [token, type]);

  const isConsent = type === "consent";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-6 w-12 h-12 rounded-full border-4 border-brand-red border-t-transparent animate-spin" />
            <p className="font-display text-navy text-xl">
              Verifying…
            </p>
          </>
        )}

        {status === "ok" && (
          <>
            <div className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold bg-green-500">
              ✓
            </div>
            <h1 className="text-3xl font-bold mb-3 font-display text-navy">
              {isConsent ? "Consent recorded!" : "You're on the map!"}
            </h1>
            <p className="mb-8 text-[#4a5568]">
              {message}
            </p>
            <Link
              href="/map"
              className="inline-block px-8 py-3 font-bold text-white uppercase tracking-widest text-sm bg-brand-red"
            >
              View the Map
            </Link>
          </>
        )}

        {status === "pending_consent" && (
          <>
            <div className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold bg-amber-400">
              ✓
            </div>
            <h1 className="text-3xl font-bold mb-3 font-display text-navy">
              Email verified!
            </h1>
            <p className="mb-8 text-[#4a5568]">
              {message}
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 font-bold uppercase tracking-widest text-sm bg-cream text-navy"
            >
              Back to Home
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold bg-brand-red">
              ✗
            </div>
            <h1 className="text-3xl font-bold mb-3 font-display text-navy">
              Verification failed
            </h1>
            <p className="mb-8 text-[#4a5568]">
              {message}
            </p>
            <Link
              href="/submit"
              className="inline-block px-8 py-3 font-bold uppercase tracking-widest text-sm bg-navy text-cream"
            >
              Submit Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
