import type { Breach } from '../breaches/types'
import { normaliseBreachName } from '../dedupeBreaches'

// XposedOrNot — keyless. The check-email endpoint returns breach names nested
// one level deep: { "breaches": [["Adobe", "Canva", ...]] }. A clean email
// returns 404 (or an { Error } body).
const ENDPOINT = 'https://api.xposedornot.com/v1/check-email'

interface XposedResponse {
  breaches?: string[][]
}

export async function checkXposedOrNot(email: string): Promise<Breach[]> {
  const url = `${ENDPOINT}/${encodeURIComponent(email)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })

  if (res.status === 404) return [] // clean — email not found
  if (!res.ok) throw new Error(`XposedOrNot responded ${res.status}`)

  const data = (await res.json()) as XposedResponse
  const names = data.breaches?.[0] ?? []

  return names.map((name) => ({
    name,
    key: normaliseBreachName(name),
    sources: ['xposedornot'],
  }))
}
