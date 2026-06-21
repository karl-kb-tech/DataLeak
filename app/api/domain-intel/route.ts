import { NextRequest, NextResponse } from 'next/server'
import { searchByDomain } from '@/lib/sources/hudsonrock'
import { normaliseDomain } from '@/lib/dorks'
import { enforceRateLimit } from '@/lib/rateLimit'

// Looks up an organisation domain against Hudson Rock's keyless info-stealer
// dataset, returning aggregate footprint stats (no individual records, no
// credentials). Drives the opt-in "breach & malware data" panel in the
// organisation-footprint feature. Nothing is logged or stored.

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, 'domain-intel', 20)
  if (limited) return limited

  let domain: string
  try {
    const body = await req.json()
    const normalised = normaliseDomain(body?.domain)
    if (!normalised) return NextResponse.json({ error: 'invalid_domain' }, { status: 400 })
    domain = normalised
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  try {
    const intel = await searchByDomain(domain)
    return NextResponse.json(
      { intel, source: { source: 'hudsonrock', ok: true } },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { intel: null, source: { source: 'hudsonrock', ok: false } },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
