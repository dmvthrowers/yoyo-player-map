import { useState, useEffect } from "react";
import { apiUrl } from "../lib/api";

export default function StatusPage() {
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    fetch(apiUrl("/api/healthz"))
      .then((r) => (r.ok ? setApiStatus("ok") : setApiStatus("error")))
      .catch(() => setApiStatus("error"));
  }, []);

  const statusLabel = apiStatus === "ok" ? "Operational" : apiStatus === "error" ? "Degraded" : "Checking…";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <p className="eyebrow mb-2">System</p>
      <h1 className="text-4xl mb-8 font-display text-navy-deep">Service Status</h1>

      <div className="space-y-4">
        {[
          { label: "API Server", status: apiStatus },
          { label: "Map Data", status: apiStatus },
          { label: "Email Service", status: "ok" as const },
          { label: "Database", status: apiStatus },
        ].map(({ label, status }) => {
          const dotClass = status === "ok" ? "bg-green-500" : status === "error" ? "bg-brand-red" : "bg-amber-400";
          const textClass = status === "ok" ? "text-green-500" : status === "error" ? "text-brand-red" : "text-amber-400";
          const text = status === "ok" ? "Operational" : status === "error" ? "Degraded" : "Checking…";
          return (
            <div key={label} className="card flex items-center justify-between">
              <span className="font-medium text-navy-deep">{label}</span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
                <span className={textClass}>{text}</span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-8 text-text-muted">
        Having issues? Contact <a href="mailto:contact@dmvthrowers.club" className="underline text-brand-red">contact@dmvthrowers.club</a>
      </p>
    </div>
  );
}
