import { describe, it, expect } from 'vitest'
import { getPlatforms } from './loader'
import { CURATED_SET } from './curated'

// These hit getPlatforms() which may try a one-time upstream refresh; the loader
// falls back to the bundled snapshot on any network failure, so the curated
// subset is always a strict subset of the full list regardless.

describe('getPlatforms scope', () => {
  it("defaults to the curated subset and stays within it", async () => {
    const curated = await getPlatforms()
    expect(curated.length).toBeGreaterThan(0)
    expect(curated.every((p) => CURATED_SET.has(p.name))).toBe(true)
  })

  it("'all' returns the full list, a superset of curated", async () => {
    const all = await getPlatforms('all')
    const curated = await getPlatforms('curated')
    expect(all.length).toBeGreaterThan(curated.length)
    const allNames = new Set(all.map((p) => p.name))
    expect(curated.every((p) => allNames.has(p.name))).toBe(true)
  })
})
