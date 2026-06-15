import { NextRequest, NextResponse } from 'next/server'

// In-memory, fixed-window rate limiter. Keeps the tool from being abused as a
// free proxy to the upstream services.
//
// EPHEMERALITY: state is a module-level Map (counts + window resets only) — no
// database, no logging, nothing persisted. On a serverless platform this is
// per-instance, so it's a best-effort throttle, not a global guarantee; that's
// an acceptable trade-off given the no-persistence constraint. IPs are held
// transiently as map keys for the window duration and never logged.

interface Window {
  count: number
  resetAt: number
}

const windows = new Map<string, Window>()
const WINDOW_MS = 60_000
const PRUNE_THRESHOLD = 10_000

export interface RateLimitResult {
  ok: boolean
  remaining: number
  /** Seconds until the window resets (0 when not limited). */
  retryAfter: number
}

function prune(now: number): void {
  for (const [key, win] of windows) {
    if (win.resetAt <= now) windows.delete(key)
  }
}

// Pure, testable core. `now` is injectable so tests don't depend on the clock.
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number = WINDOW_MS,
  now: number = Date.now(),
): RateLimitResult {
  if (windows.size > PRUNE_THRESHOLD) prune(now)

  const win = windows.get(key)
  if (!win || win.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }
  if (win.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((win.resetAt - now) / 1000) }
  }
  win.count += 1
  return { ok: true, remaining: limit - win.count, retryAfter: 0 }
}

/**
 * Best-effort client identifier from proxy headers.
 *
 * Prefer `x-real-ip`: on Vercel the platform sets it to the true client IP and
 * it cannot be spoofed by the caller. `x-forwarded-for` is only a fallback — a
 * client can prepend a forged entry, so the leftmost value there is untrusted
 * and would let an attacker rotate fake IPs to evade the limit.
 */
export function clientKey(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown'
}

// Route helper: returns a 429 response if the caller is over the limit for this
// route, otherwise null (proceed).
export function enforceRateLimit(
  req: NextRequest,
  route: string,
  limit: number,
): NextResponse | null {
  const result = rateLimit(`${route}:${clientKey(req)}`, limit)
  if (result.ok) return null
  return NextResponse.json(
    { error: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
  )
}
