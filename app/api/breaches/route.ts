import { NextRequest, NextResponse } from 'next/server'
import { checkLeakCheck } from '@/lib/sources/leakcheck'
import { checkXposedOrNot } from '@/lib/sources/xposedornot'
import { checkHibp } from '@/lib/sources/hibp'
import { mergeBreaches } from '@/lib/dedupeBreaches'
import { validateEmail } from '@/lib/validation'
import { enforceRateLimit } from '@/lib/rateLimit'
import type { Breach, BreachSource, SourceStatus } from '@/lib/breaches/types'

// Fans out an email to LeakCheck (public) and XposedOrNot, plus HIBP when an
// API key is configured, then de-dupes the merged breach list on normalised
// breach name.
//
// Uses Promise.allSettled — never Promise.all. If one source is down the others
// must still return. Nothing about the query or its result is logged or stored.
//
// NOTE: any UI showing LeakCheck-derived results must display a
// "Powered by LeakCheck" attribution link (ToS requirement).

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, 'breaches', 20)
  if (limited) return limited

  let email: string
  try {
    const body = await req.json()
    const valid = validateEmail(body?.email)
    if (!valid.ok) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
    }
    email = valid.value
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  // HIBP is opt-in: only queried when a key is present. Keyless deployments
  // gracefully fall back to LeakCheck + XposedOrNot.
  const hibpKey = process.env.HIBP_API_KEY
  const checks: { source: BreachSource; run: () => Promise<Breach[]> }[] = [
    { source: 'leakcheck', run: () => checkLeakCheck(email) },
    { source: 'xposedornot', run: () => checkXposedOrNot(email) },
  ]
  if (hibpKey) {
    checks.push({ source: 'hibp', run: () => checkHibp(email, hibpKey) })
  }

  const settled = await Promise.allSettled(checks.map((c) => c.run()))

  const breaches: Breach[] = []
  const sources: SourceStatus[] = checks.map((check, i) => {
    const result = settled[i]
    if (result.status === 'fulfilled') {
      breaches.push(...result.value)
      return { source: check.source, ok: true }
    }
    return { source: check.source, ok: false }
  })

  return NextResponse.json(
    {
      breaches: mergeBreaches(breaches),
      sources,
      hibpEnabled: Boolean(hibpKey),
    },
    // Keep the breach result out of the browser's HTTP/disk cache — same
    // ephemerality reasoning as the password route.
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
