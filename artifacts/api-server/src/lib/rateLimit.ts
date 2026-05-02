interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

export function checkRateLimit(
  ip: string,
  action: string,
  max: number,
  windowMinutes: number,
): boolean {
  const key = `${action}:${ip}`;
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  const win = store.get(key);
  if (!win || now >= win.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (win.count >= max) return false;
  win.count += 1;
  return true;
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined> }): string {
  const fwd = req.headers["x-forwarded-for"];
  if (Array.isArray(fwd)) return fwd[0].trim();
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return (req.headers["x-real-ip"] as string | undefined) ?? "unknown";
}

setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store) {
    if (now >= win.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);
