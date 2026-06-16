import { NextRequest, NextResponse } from 'next/server'
import { getPlatforms } from '@/lib/sherlock/loader'
import { checkPlatform } from '@/lib/sherlock/check'
import { mapWithConcurrency } from '@/lib/concurrency'
import { validateUsername } from '@/lib/validation'
import { enforceRateLimit } from '@/lib/rateLimit'
import { toScope } from '@/lib/sherlock/curated'

// Checks a username against platform URL patterns sourced from Sherlock's
// data.json (reimplemented in TS — no Python, no subprocess).
//
// Concurrency is capped to avoid tripping platform bot-detection. The platform
// list is trusted (bundled) and the username is charset-validated and
// URL-encoded before building any URL, so this is not an open SSRF surface.
// Nothing is logged.
//
// Results stream back as Server-Sent Events so the UI can render hits as they
// arrive instead of blocking on the whole sweep:
//   event: progress  data: { checked, total }      // one per platform settled
//   event: hit        data: { name, url, urlMain }  // one per confirmed profile
//   event: done       data: { platformsChecked, hits, unreachable }
//   event: error      data: { error }               // unexpected failure
//
// `scope` (request body) selects the platform set: 'curated' (default,
// high-signal subset — fast, low-noise) or 'all' (full ~481-platform sweep).

// Allow a longer execution window on Vercel — the full sweep is intentionally
// rate-limited, so it takes time.
export const maxDuration = 60

const CONCURRENCY = 12

// The full sweep is expensive (hundreds of outbound checks) — throttle it hard.
// The curated subset is ~10x smaller, so it gets a more generous allowance.
const RATE_LIMITS = { curated: 20, all: 5 } as const

export async function POST(req: NextRequest) {
  let username: string
  let scope: 'curated' | 'all'
  try {
    const body = await req.json()
    const valid = validateUsername(body?.username)
    if (!valid.ok) {
      return NextResponse.json({ error: 'invalid_username' }, { status: 400 })
    }
    username = valid.value
    scope = toScope(body?.scope)
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  // Separate buckets so a curated sweep can't exhaust the full-sweep allowance.
  const limited = enforceRateLimit(req, `username:${scope}`, RATE_LIMITS[scope])
  if (limited) return limited

  const platforms = await getPlatforms(scope)
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        )

      let checked = 0
      let hits = 0
      let unreachable = 0
      const total = platforms.length

      try {
        await mapWithConcurrency(
          platforms,
          CONCURRENCY,
          (p) => checkPlatform(p, username),
          (result) => {
            checked += 1
            if (result.found === true) {
              hits += 1
              send('hit', {
                name: result.name,
                url: result.url,
                urlMain: result.urlMain,
              })
            } else if (result.found === null) {
              unreachable += 1
            }
            send('progress', { checked, total })
          },
        )
        send('done', { platformsChecked: checked, hits, unreachable })
      } catch {
        // checkPlatform swallows its own errors, so this is a last-resort guard.
        send('error', { error: 'sweep_failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  })
}
