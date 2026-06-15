import type { Breach } from '../breaches/types'
import { normaliseBreachName } from '../dedupeBreaches'

// Have I Been Pwned breach API — PAID, requires an API key. Only called when
// HIBP_API_KEY is set in the environment; otherwise /api/breaches skips it.
//
// HIBP requires BOTH an `hibp-api-key` header and a descriptive `User-Agent`,
// or it returns 403. A clean email returns 404.
const ENDPOINT = 'https://haveibeenpwned.com/api/v3/breachedaccount'
const USER_AGENT = 'NZ-Privacy-Awareness-Tool'

interface HibpBreach {
  Name: string
  Title: string
  BreachDate: string
  DataClasses: string[]
  Description: string
}

export async function checkHibp(email: string, apiKey: string): Promise<Breach[]> {
  const url = `${ENDPOINT}/${encodeURIComponent(email)}?truncateResponse=false`
  const res = await fetch(url, {
    headers: {
      'hibp-api-key': apiKey,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  })

  if (res.status === 404) return [] // clean — email not found
  if (!res.ok) throw new Error(`HIBP responded ${res.status}`)

  const data = (await res.json()) as HibpBreach[]
  return data.map((b) => ({
    name: b.Title || b.Name,
    key: normaliseBreachName(b.Name),
    title: b.Title,
    date: b.BreachDate,
    dataClasses: b.DataClasses,
    description: b.Description,
    sources: ['hibp'],
  }))
}
