import { NextRequest, NextResponse } from 'next/server'

// Fans out an email to LeakCheck (public) and XposedOrNot, then de-dupes the
// merged breach list on normalised breach name.
//
// Use Promise.allSettled — never Promise.all. If one source is down the other
// must still return. Nothing about the query or its result is logged.
//
// NOTE: any UI showing LeakCheck-derived results must display a
// "Powered by LeakCheck" attribution link (ToS requirement).
export async function POST(_req: NextRequest) {
  // TODO: validate + normalise email, fan out to both sources, de-dupe.
  return NextResponse.json({ error: 'not_implemented' }, { status: 501 })
}
