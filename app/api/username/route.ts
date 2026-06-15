import { NextRequest, NextResponse } from 'next/server'

// Checks a username against platform URL patterns sourced from Sherlock's
// data.json (reimplemented in TS — no Python, no subprocess).
//
// Rate-limit concurrent checks (10-15 simultaneous) to avoid platform bot
// detection. Strip a leading "@" and validate against a safe character set
// before building any URL. Nothing is logged.
export async function POST(_req: NextRequest) {
  // TODO: load platform patterns, fan out GETs with bounded concurrency,
  // classify each as hit/miss against the platform's error pattern.
  return NextResponse.json({ error: 'not_implemented' }, { status: 501 })
}
