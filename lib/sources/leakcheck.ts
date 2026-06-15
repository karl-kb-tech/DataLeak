import type { Breach } from '../breaches/types'
import { normaliseBreachName } from '../dedupeBreaches'

// LeakCheck public API — keyless. Returns the list of sources (breach names +
// dates) an email appears in. Any UI showing these results must display a
// "Powered by LeakCheck" attribution link (ToS requirement).
const ENDPOINT = 'https://leakcheck.io/api/public'

interface LeakCheckSource {
  name: string
  date?: string
}

interface LeakCheckResponse {
  success?: boolean
  found?: number
  sources?: LeakCheckSource[]
}

export async function checkLeakCheck(email: string): Promise<Breach[]> {
  const url = `${ENDPOINT}?check=${encodeURIComponent(email)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })

  if (res.status === 404) return [] // clean — email not found
  if (!res.ok) throw new Error(`LeakCheck responded ${res.status}`)

  const data = (await res.json()) as LeakCheckResponse
  if (!data.success || !Array.isArray(data.sources)) return []

  return data.sources.map((s) => ({
    name: s.name,
    key: normaliseBreachName(s.name),
    date: s.date,
    sources: ['leakcheck'],
  }))
}
