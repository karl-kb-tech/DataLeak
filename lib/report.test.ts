import { describe, it, expect } from 'vitest'
import { buildReport } from './report'

const AT = '16 June 2026, 9:00 am'

describe('buildReport', () => {
  it('includes only the checks that were run', () => {
    const model = buildReport({ password: { pwned: false, count: 0 } }, AT)
    expect(model.sections.map((s) => s.title)).toEqual(['Password exposure'])
    expect(model.generatedAt).toBe(AT)
  })

  it('lists breach findings and adds the LeakCheck attribution when used', () => {
    const model = buildReport(
      {
        breach: {
          email: 'a@b.com',
          breaches: [{ name: 'LinkedIn', title: 'LinkedIn', date: '2021' }],
          usedLeakCheck: true,
        },
      },
      AT,
    )
    const section = model.sections[0]
    expect(section.sent).toBe('a@b.com')
    expect(section.findings).toEqual(['LinkedIn (2021)'])
    expect(model.attributions).toContain('Breach data powered by LeakCheck (leakcheck.io).')
  })

  it('omits the LeakCheck attribution when that source was not used', () => {
    const model = buildReport(
      { breach: { email: 'a@b.com', breaches: [], usedLeakCheck: false } },
      AT,
    )
    expect(model.attributions).toEqual([])
  })

  it('maps username hits to finding lines', () => {
    const model = buildReport(
      { username: { username: 'octocat', hits: [{ name: 'GitHub' }, { name: 'Reddit' }] } },
      AT,
    )
    expect(model.sections[0].findings).toEqual(['GitHub', 'Reddit'])
    expect(model.sections[0].remediation.headline).toMatch(/2 platforms/)
  })

  it('never echoes the raw password — only the fragment note', () => {
    const model = buildReport({ password: { pwned: true, count: 5 } }, AT)
    expect(model.sections[0].sent).toContain('never the password')
  })

  it('always carries a disclaimer and intro', () => {
    const model = buildReport({}, AT)
    expect(model.disclaimer).toMatch(/never stored|not.*guarantee|browser/i)
    expect(model.intro).toBeTruthy()
    expect(model.sections).toEqual([])
  })
})
