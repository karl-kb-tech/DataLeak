// Normalises and de-dupes breach results merged from HIBP, LeakCheck and
// XposedOrNot.
//
// Breach names are not standardised across services. First pass: lowercase and
// strip punctuation/years. Then apply a known-aliases map for common
// discrepancies. When in doubt, prefer showing a duplicate over silently
// dropping a result.

import type { Breach } from './breaches/types'

// Common cross-service name discrepancies. Extend as new mismatches surface.
export const BREACH_ALIASES: Record<string, string> = {
  linkedin_2021: 'linkedin',
}

export function normaliseBreachName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, '') // strip years
    .replace(/[^a-z0-9]/g, '') // strip punctuation/whitespace
    .trim()
  return BREACH_ALIASES[base] ?? base
}

// Merges breaches from all sources on their normalised key. When two sources
// report the same breach, their `sources` lists are combined and the richer
// fields (HIBP supplies date/dataClasses/description) fill any gaps — so the
// UI can show "found by HIBP + LeakCheck" with the best available detail.
export function mergeBreaches(all: Breach[]): Breach[] {
  const byKey = new Map<string, Breach>()

  for (const b of all) {
    const existing = byKey.get(b.key)
    if (!existing) {
      byKey.set(b.key, { ...b, sources: [...b.sources] })
      continue
    }
    for (const s of b.sources) {
      if (!existing.sources.includes(s)) existing.sources.push(s)
    }
    existing.title ??= b.title
    existing.date ??= b.date
    existing.description ??= b.description
    existing.dataClasses ??= b.dataClasses
  }

  return [...byKey.values()]
}
