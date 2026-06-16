import { describe, it, expect } from 'vitest'
import { mapWithConcurrency } from './concurrency'

describe('mapWithConcurrency', () => {
  it('preserves input order', async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 10)
    expect(out).toEqual([10, 20, 30, 40, 50])
  })

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0
    let peak = 0
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
    })
    expect(peak).toBeLessThanOrEqual(4)
  })

  it('handles an empty list', async () => {
    expect(await mapWithConcurrency([], 4, async (x) => x)).toEqual([])
  })

  it('fires onResult once per item with the result, item, and index', async () => {
    const seen: Array<[number, number, number]> = []
    await mapWithConcurrency([1, 2, 3], 2, async (n) => n * 10, (result, item, index) =>
      seen.push([result, item, index]),
    )
    seen.sort((a, b) => a[2] - b[2])
    expect(seen).toEqual([
      [10, 1, 0],
      [20, 2, 1],
      [30, 3, 2],
    ])
  })
})
