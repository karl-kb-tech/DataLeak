import { NextRequest, NextResponse } from 'next/server'
import { searchByEmail, searchByUsername, type InfectionMatch } from '@/lib/sources/hudsonrock'
import { validateEmail, validateUsername } from '@/lib/validation'
import { enforceRateLimit } from '@/lib/rateLimit'

// Looks up an email and/or username against Hudson Rock's keyless info-stealer
// dataset. This is malware-infection data, not breach data — kept as its own
// result section rather than merged into /api/breaches.
//
// Uses Promise.allSettled over whichever identifiers were supplied: if one lookup
// fails the other must still return. Nothing is logged or stored.

interface SourceStatus {
  source: 'hudsonrock'
  ok: boolean
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, 'infections', 20)
  if (limited) return limited

  let email: string | undefined
  let username: string | undefined
  try {
    const body = await req.json()
    if (body?.email != null && body.email !== '') {
      const valid = validateEmail(body.email)
      if (!valid.ok) return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
      email = valid.value
    }
    if (body?.username != null && body.username !== '') {
      const valid = validateUsername(body.username)
      if (!valid.ok) return NextResponse.json({ error: 'invalid_username' }, { status: 400 })
      username = valid.value
    }
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!email && !username) {
    return NextResponse.json({ error: 'nothing_to_check' }, { status: 400 })
  }

  const lookups: (() => Promise<InfectionMatch>)[] = []
  if (email) {
    const e = email
    lookups.push(() => searchByEmail(e))
  }
  if (username) {
    const u = username
    lookups.push(() => searchByUsername(u))
  }

  const settled = await Promise.allSettled(lookups.map((run) => run()))

  const matches: InfectionMatch[] = []
  let anyOk = false
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      matches.push(result.value)
      anyOk = true
    }
  }
  const sources: SourceStatus[] = [{ source: 'hudsonrock', ok: anyOk }]

  return NextResponse.json(
    { matches, sources },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
