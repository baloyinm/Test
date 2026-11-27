// Fixed-window rate limiter, in memory (per server instance). No secrets, no network.
// Limits are settings: INTAKE_RATE_MAX (default 5) and INTAKE_RATE_WINDOW_SECONDS (default 60).
// A shared store (Vercel KV / Edge Config) can replace `store` later without changing callers.
export function createLimiter({ max = 5, windowMs = 60000, now = () => Date.now(), store = new Map() } = {}) {
  return {
    check(key) {
      const t = now();
      const e = store.get(key);
      if (!e || t - e.start >= windowMs) { store.set(key, { start: t, count: 1 }); return { allowed: true, retryAfter: 0 }; }
      e.count += 1;
      if (e.count > max) return { allowed: false, retryAfter: Math.ceil((e.start + windowMs - t) / 1000) };
      return { allowed: true, retryAfter: 0 };
    },
  };
}
export function clientKey(headers) {
  const xff = headers.get('x-forwarded-for');
  return (xff ? xff.split(',')[0].trim() : headers.get('x-real-ip')) || 'unknown';
}
