import { describe, it, expect } from 'vitest'
import { hashPassword } from './hashPassword'

// SHA-1 of "password" is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8.
describe('hashPassword', () => {
  it('splits the uppercase SHA-1 into a 5-char prefix and suffix', async () => {
    const { prefix, suffix } = await hashPassword('password')
    expect(prefix).toBe('5BAA6')
    expect(suffix).toBe('1E4C9B93F3F0682250B6CF8331B7EE68FD8')
    expect(prefix + suffix).toHaveLength(40)
  })

  it('produces a 5-char hex prefix for arbitrary input', async () => {
    const { prefix } = await hashPassword('hunter2')
    expect(prefix).toMatch(/^[0-9A-F]{5}$/)
  })
})
