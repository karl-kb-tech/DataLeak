import { NextRequest, NextResponse } from 'next/server'

// Forwards a 5-char SHA-1 prefix to HIBP Pwned Passwords (k-anonymity).
//
// IMPORTANT: the raw password is hashed CLIENT-SIDE. This route must only ever
// receive a 5-character hex prefix — never a password, never a full hash.
// If you find yourself reading a password here, the implementation is wrong.
export async function POST(_req: NextRequest) {
  // TODO: validate prefix is exactly 5 hex chars, then GET
  // https://api.pwnedpasswords.com/range/{prefix} and return the suffix list.
  return NextResponse.json({ error: 'not_implemented' }, { status: 501 })
}
