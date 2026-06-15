import { describe, it, expect } from 'vitest'
import { rateLimit } from './rateLimit'

// Each test uses a unique key so the shared module-level window map doesn't
// bleed state across cases, and an explicit `now` for determinism.
describe('rateLimit', () => {
  it('allows up to the limit, then blocks', () => {
    const k = 'test-basic'
    expect(rateLimit(k, 3, 1000, 0).ok).toBe(true)
    expect(rateLimit(k, 3, 1000, 0).ok).toBe(true)
    expect(rateLimit(k, 3, 1000, 0).ok).toBe(true)
    const blocked = rateLimit(k, 3, 1000, 0)
    expect(blocked.ok).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('reports decreasing remaining count', () => {
    const k = 'test-remaining'
    expect(rateLimit(k, 2, 1000, 0).remaining).toBe(1)
    expect(rateLimit(k, 2, 1000, 0).remaining).toBe(0)
  })

  it('resets after the window elapses', () => {
    const k = 'test-reset'
    rateLimit(k, 1, 1000, 0)
    expect(rateLimit(k, 1, 1000, 500).ok).toBe(false) // still in window
    expect(rateLimit(k, 1, 1000, 1001).ok).toBe(true) // window expired
  })

  it('isolates separate keys', () => {
    expect(rateLimit('test-a', 1, 1000, 0).ok).toBe(true)
    expect(rateLimit('test-b', 1, 1000, 0).ok).toBe(true)
  })
})
