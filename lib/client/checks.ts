// Client-side orchestration of the three checks. These run in the browser and
// call the stateless API routes. Nothing here persists anything — results are
// returned to React state and vanish with the tab.
//
// The raw password never appears in this module's network calls: hashPassword
// produces a 5-char prefix (sent) + suffix (matched locally). See hashPassword.

import { hashPassword } from '@/lib/hashPassword'
import { readSSE } from '@/lib/client/sse'
import { BASE_PATH } from '@/lib/basePath'
import type { Breach, SourceStatus } from '@/lib/breaches/types'

export interface PasswordCheck {
  pwned: boolean
  /** How many times the password appears in breach corpora (0 if not found). */
  count: number
}

export interface BreachCheck {
  breaches: Breach[]
  sources: SourceStatus[]
  hibpEnabled: boolean
}

export interface UsernameHit {
  name: string
  url: string
  urlMain: string
}

export interface UsernameDone {
  platformsChecked: number
  hits: number
  unreachable: number
}

export type UsernameScope = 'curated' | 'all'

/**
 * Match a password against HIBP via k-anonymity. The password is hashed in the
 * browser; only the 5-char prefix is sent. The returned suffix:count list is
 * matched locally, so the server never learns the full hash or the verdict.
 */
export async function checkPassword(password: string): Promise<PasswordCheck> {
  const { prefix, suffix } = await hashPassword(password)
  const res = await fetch(`${BASE_PATH}/api/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix }),
  })
  if (!res.ok) throw new Error('password_check_failed')
  const body = await res.text()
  return matchSuffix(body, suffix)
}

/** Parse HIBP's "SUFFIX:COUNT" lines and look for our suffix. Pure + tested. */
export function matchSuffix(body: string, suffix: string): PasswordCheck {
  const target = suffix.toUpperCase()
  for (const line of body.split('\n')) {
    const [lineSuffix, countStr] = line.trim().split(':')
    if (lineSuffix?.toUpperCase() === target) {
      const count = Number.parseInt(countStr ?? '0', 10)
      return { pwned: count > 0, count: Number.isFinite(count) ? count : 0 }
    }
  }
  return { pwned: false, count: 0 }
}

/** Look up an email across the configured breach sources. */
export async function checkBreaches(email: string): Promise<BreachCheck> {
  const res = await fetch(`${BASE_PATH}/api/breaches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error('breach_check_failed')
  return (await res.json()) as BreachCheck
}

export interface UsernameHandlers {
  onProgress?: (checked: number, total: number) => void
  onHit?: (hit: UsernameHit) => void
  onDone?: (summary: UsernameDone) => void
  onError?: (error: string) => void
  signal?: AbortSignal
}

/**
 * Stream a username sweep, invoking handlers as SSE events arrive. `scope`
 * defaults to the curated high-signal subset; 'all' runs the full sweep.
 */
export async function runUsernameSweep(
  username: string,
  scope: UsernameScope,
  handlers: UsernameHandlers,
): Promise<void> {
  const res = await fetch(`${BASE_PATH}/api/username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, scope }),
    signal: handlers.signal,
  })
  if (!res.ok || !res.body) {
    handlers.onError?.('username_check_failed')
    return
  }
  for await (const frame of readSSE(res.body)) {
    let data: unknown
    try {
      data = JSON.parse(frame.data)
    } catch {
      continue
    }
    switch (frame.event) {
      case 'progress': {
        const d = data as { checked: number; total: number }
        handlers.onProgress?.(d.checked, d.total)
        break
      }
      case 'hit':
        handlers.onHit?.(data as UsernameHit)
        break
      case 'done':
        handlers.onDone?.(data as UsernameDone)
        break
      case 'error':
        handlers.onError?.((data as { error: string }).error ?? 'unknown')
        break
    }
  }
}
