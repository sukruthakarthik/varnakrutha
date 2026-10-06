import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

const globalBuckets = globalThis as unknown as { __rateLimit?: Map<string, Bucket> };
const buckets = (globalBuckets.__rateLimit ??= new Map<string, Bucket>());

/**
 * Best-effort fixed-window limiter. Per-instance only — use a shared store
 * (e.g. Upstash/Vercel KV) if stronger guarantees are needed.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
