import { describe, it, expect } from 'vitest'
import {
  passwordRemediation,
  breachRemediation,
  usernameRemediation,
} from './remediation'

describe('passwordRemediation', () => {
  it('reassures when the password is clean', () => {
    const r = passwordRemediation(false, 0)
    expect(r.headline).toMatch(/wasn't found/i)
    expect(r.steps.length).toBeGreaterThan(0)
  })

  it('formats the breach count and gives change-it steps when pwned', () => {
    const r = passwordRemediation(true, 1200)
    expect(r.headline).toContain('1,200')
    expect(r.steps[0]).toMatch(/stop using/i)
  })

  it('uses singular phrasing for a single occurrence', () => {
    expect(passwordRemediation(true, 1).headline).toMatch(/1 time\b/)
  })
})

describe('breachRemediation', () => {
  it('handles the no-breach case', () => {
    expect(breachRemediation(0).headline).toMatch(/didn't find/i)
  })

  it('pluralises correctly', () => {
    expect(breachRemediation(1).headline).toMatch(/1 known data breach\b/)
    expect(breachRemediation(3).headline).toMatch(/3 known data breaches/)
  })
})

describe('usernameRemediation', () => {
  it('handles the no-hit case', () => {
    expect(usernameRemediation(0).headline).toMatch(/didn't find/i)
  })

  it('pluralises platforms', () => {
    expect(usernameRemediation(1).headline).toMatch(/1 platform\b/)
    expect(usernameRemediation(5).headline).toMatch(/5 platforms/)
  })
})
