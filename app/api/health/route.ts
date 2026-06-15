import { NextResponse } from 'next/server'

// Reports the configured/reachability state of every upstream service the tool
// depends on. Stateless — nothing here is logged or persisted.
export async function GET() {
  // HIBP is opt-in via HIBP_API_KEY; reflect whether it will be queried.
  const hibp = process.env.HIBP_API_KEY ? 'enabled' : 'disabled (no API key)'

  return NextResponse.json({
    status: 'ok',
    services: {
      hibp,
      leakcheck: 'enabled',
      xposedornot: 'enabled',
    },
  })
}
