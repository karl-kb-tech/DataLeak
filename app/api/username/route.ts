import { NextRequest, NextResponse } from 'next/server'
import { getPlatforms } from '@/lib/sherlock/loader'
import { checkPlatform } from '@/lib/sherlock/check'
import { mapWithConcurrency } from '@/lib/concurrency'

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
// Strip a leading @, then require a conservative handle charset.
const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/

export async function POST(req: NextRequest) {
  let username: string
  try {
    const body = await req.json()
    username = String(body?.username ?? '').trim().replace(/^@+/, '')
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: 'invalid_username' }, { status: 400 })
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
