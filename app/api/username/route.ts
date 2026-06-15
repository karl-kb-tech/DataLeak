import { NextRequest, NextResponse } from 'next/server'
import { getPlatforms } from '@/lib/sherlock/loader'
import { checkPlatform } from '@/lib/sherlock/check'
import { mapWithConcurrency } from '@/lib/concurrency'
import { validateUsername } from '@/lib/validation'
import { enforceRateLimit } from '@/lib/rateLimit'

// Checks a username against platform URL patterns sourced from Sherlock's
// data.json (reimplemented in TS — no Python, no subprocess).
//
// Concurrency is capped to avoid tripping platform bot-detection. The platform
// list is trusted (bundled) and the username is charset-validated and
// URL-encoded before building any URL, so this is not an open SSRF surface.
// Nothing is logged.

// Allow a longer execution window on Vercel — the fan-out is intentionally
// rate-limited, so the whole sweep takes time.
export const maxDuration = 60

const CONCURRENCY = 12

export async function POST(req: NextRequest) {
  // The sweep is expensive (hundreds of outbound checks) — limit it tightly.
  const limited = enforceRateLimit(req, 'username', 5)
  if (limited) return limited

  let username: string
  try {
    const body = await req.json()
    const valid = validateUsername(body?.username)
    if (!valid.ok) {
      return NextResponse.json({ error: 'invalid_username' }, { status: 400 })
    }
    username = valid.value
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const platforms = await getPlatforms()
  const results = await mapWithConcurrency(platforms, CONCURRENCY, (p) =>
    checkPlatform(p, username),
  )

  const found = results.filter((r) => r.found === true)
  const errored = results.filter((r) => r.found === null).length

  return NextResponse.json({
    found,
    stats: {
      platformsChecked: results.length,
      hits: found.length,
      unreachable: errored,
    },
  })
}
