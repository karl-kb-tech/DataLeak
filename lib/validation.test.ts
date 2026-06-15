import { describe, it, expect } from 'vitest'
import { validateEmail, validateUsername, validatePasswordPrefix } from './validation'

describe('validateEmail', () => {
  it('accepts and normalises a valid address', () => {
    expect(validateEmail('  User@Example.COM ')).toEqual({ ok: true, value: 'user@example.com' })
  })

  it('rejects malformed addresses', () => {
    for (const bad of ['', 'plainaddress', 'no@domain', 'a@b@c.com', 'spaces in@x.com', '@x.com']) {
      expect(validateEmail(bad).ok).toBe(false)
    }
  })

  it('rejects over-length addresses', () => {
    const long = `${'a'.repeat(250)}@x.com`
    expect(validateEmail(long).ok).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(validateEmail(null).ok).toBe(false)
    expect(validateEmail(undefined).ok).toBe(false)
    expect(validateEmail(42).ok).toBe(false)
  })
})

describe('validateUsername', () => {
  it('strips leading @(s) and accepts a safe handle', () => {
    expect(validateUsername('@@jdoe')).toEqual({ ok: true, value: 'jdoe' })
    expect(validateUsername('  user.name_1-2 ')).toEqual({ ok: true, value: 'user.name_1-2' })
  })

  it('rejects unsafe characters and shapes', () => {
    for (const bad of ['', '.startsdot', '-startsdash', 'has space', 'semi;colon', 'slash/x', 'a'.repeat(31)]) {
      expect(validateUsername(bad).ok).toBe(false)
    }
  })
})

describe('validatePasswordPrefix', () => {
  it('upper-cases and accepts a 5-char hex prefix', () => {
    expect(validatePasswordPrefix('abcde')).toEqual({ ok: true, value: 'ABCDE' })
    expect(validatePasswordPrefix('00A1F')).toEqual({ ok: true, value: '00A1F' })
  })

  it('rejects wrong length or non-hex', () => {
    for (const bad of ['', 'ABCD', 'ABCDEF', 'GHIJK', '12 34', 'ZZZZZ']) {
      expect(validatePasswordPrefix(bad).ok).toBe(false)
    }
  })
})
