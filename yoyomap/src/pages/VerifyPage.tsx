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
            <div
              className="mx-auto mb-6 w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: "#D42B2B", borderTopColor: "transparent" }}
            />
            <p style={{ color: "#1a2744", fontFamily: "Georgia, serif", fontSize: "1.25rem" }}>
              Verifying…
            </p>
          </>
        )}

        {status === "ok" && (
          <>
            <div
              className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: "#22c55e" }}
            >
              ✓
            </div>
            <h1
              className="text-3xl font-bold mb-3"
              style={{ fontFamily: "Georgia, serif", color: "#1a2744" }}
            >
              {isConsent ? "Consent recorded!" : "You're on the map!"}
            </h1>
            <p className="mb-8" style={{ color: "#4a5568" }}>
              {message}
            </p>
            <Link
              href="/map"
              className="inline-block px-8 py-3 font-bold text-white uppercase tracking-widest text-sm"
              style={{ background: "#D42B2B" }}
            >
              View the Map
            </Link>
          </>
        )}

        {status === "pending_consent" && (
          <>
            <div
              className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: "#f59e0b" }}
            >
              ✓
            </div>
            <h1
              className="text-3xl font-bold mb-3"
              style={{ fontFamily: "Georgia, serif", color: "#1a2744" }}
            >
              Email verified!
            </h1>
            <p className="mb-8" style={{ color: "#4a5568" }}>
              {message}
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 font-bold uppercase tracking-widest text-sm"
              style={{ background: "#f5f0e8", color: "#1a2744" }}
            >
              Back to Home
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div
              className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: "#D42B2B" }}
            >
              ✗
            </div>
            <h1
              className="text-3xl font-bold mb-3"
              style={{ fontFamily: "Georgia, serif", color: "#1a2744" }}
            >
              Verification failed
            </h1>
            <p className="mb-8" style={{ color: "#4a5568" }}>
              {message}
            </p>
            <Link
              href="/submit"
              className="inline-block px-8 py-3 font-bold uppercase tracking-widest text-sm"
              style={{ background: "#1a2744", color: "#f5f0e8" }}
            >
              Submit Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
