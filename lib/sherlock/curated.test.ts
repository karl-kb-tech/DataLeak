import { describe, it, expect } from 'vitest'
import data from './data/data.json'
import { CURATED_PLATFORMS, CURATED_SET, toScope } from './curated'

describe('curated platform subset', () => {
  it('references only names that exist in data.json', () => {
    const keys = new Set(Object.keys(data))
    const missing = CURATED_PLATFORMS.filter((name) => !keys.has(name))
    expect(missing).toEqual([])
  })

  it('has no duplicates', () => {
    expect(CURATED_SET.size).toBe(CURATED_PLATFORMS.length)
  })

  it('is meaningfully smaller than the full list', () => {
    const total = Object.keys(data).filter((k) => k !== '$schema').length
    expect(CURATED_PLATFORMS.length).toBeLessThan(total / 4)
  })
})

describe('toScope', () => {
  it("returns 'all' only for the exact 'all' value", () => {
    expect(toScope('all')).toBe('all')
  })

  it('defaults everything else to curated', () => {
    for (const v of ['curated', 'ALL', '', undefined, null, 'x', 42, {}]) {
      expect(toScope(v)).toBe('curated')
    }
  })
})
