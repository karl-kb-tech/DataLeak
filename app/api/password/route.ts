import { NextRequest, NextResponse } from 'next/server'
import { validatePasswordPrefix } from '@/lib/validation'
import { enforceRateLimit } from '@/lib/rateLimit'

// Forwards a 5-char SHA-1 prefix to HIBP Pwned Passwords (k-anonymity).
//
// IMPORTANT: the raw password is hashed CLIENT-SIDE. This route only ever
// receives a 5-character hex prefix — never a password, never a full hash.
// If you find yourself reading a password here, the implementation is wrong.
//
// The suffix list returned by HIBP is passed straight back to the client, which
// matches it against the locally-held suffix. The server never sees the full
// hash and never learns whether the password was found. Nothing is logged.

const ENDPOINT = 'https://api.pwnedpasswords.com/range'

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, 'password', 60)
  if (limited) return limited

  let prefix: string
  try {
    const body = await req.json()
    const valid = validatePasswordPrefix(body?.prefix)
    if (!valid.ok) {
      return NextResponse.json({ error: 'invalid_prefix' }, { status: 400 })
    }
    prefix = valid.value
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  try {
    const res = await fetch(`${ENDPOINT}/${prefix}`, {
      // Add-Padding pads the response so an observer can't infer the prefix
      // from the response size. https://haveibeenpwned.com/API/v3#PwnedPasswords
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_unavailable' }, { status: 502 })
    }
    // Pass the suffix list back as plain text — the client does the matching.
    const body = await res.text()
    return new NextResponse(body, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch {
    return NextResponse.json({ error: 'upstream_unavailable' }, { status: 502 })
  }
}
