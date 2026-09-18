// ── rateLimiter: a fixed-window limiter, built from scratch ────────────────
// LESSON: in a real production system you'd use Redis for this (so the
// count is shared across multiple server instances), but the ALGORITHM is
// exactly the same and worth understanding without a dependency in the way.
// This is a "fixed window" limiter: for each key (we use the user's id, or
// their IP if not logged in), we count requests within the current
// `windowMs`-sized time bucket. When the bucket's time is up, the count
// resets. It's the simplest rate-limiting strategy — real systems often use
// a "sliding window" or "token bucket" instead to avoid a burst right at the
// window boundary, but fixed-window is the one to understand first.
//
// We especially want this on the AI agent routes: every call to POST
// /api/agent/chat costs real money (Anthropic API usage) and can take
// several seconds. Without a limiter, one buggy client retry-looping could
// run up a bill in minutes.
const buckets = new Map(); // key -> { count, resetAt }

export function rateLimiter({ windowMs = 60_000, max = 20 } = {}) {
  return function rateLimiterMiddleware(req, res, next) {
    const key = req.user?.id ?? req.ip;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));

    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: { message: `Too many requests — try again in ${retryAfterSeconds}s` },
      });
    }

    next();
  };
}
