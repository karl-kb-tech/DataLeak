import { NextResponse } from 'next/server'

// Reports the reachability of every upstream service the tool depends on.
// Stateless — nothing here is logged or persisted.
export async function GET() {
  // TODO: ping HIBP, LeakCheck, XposedOrNot and report per-service status.
  return NextResponse.json({
    status: 'ok',
    services: {
      hibp: 'unknown',
      leakcheck: 'unknown',
      xposedornot: 'unknown',
    },
  })
}
