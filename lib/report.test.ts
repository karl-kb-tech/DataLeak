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

  it('adds an info-stealer section with high-level findings, no masked creds', () => {
    const model = buildReport(
      {
        infections: {
          sent: 'a@b.com, octocat',
          infected: true,
          targets: [
            { target: 'a@b.com', records: 3, lastCompromised: '15 June 2026' },
            { target: 'octocat', records: 1 },
          ],
        },
      },
      AT,
    )
    const section = model.sections[0]
    expect(section.title).toBe('Info-stealer malware exposure')
    expect(section.sent).toBe('a@b.com, octocat')
    expect(section.findings).toEqual([
      'a@b.com: found in 3 info-stealer records (most recent 15 June 2026)',
      'octocat: found in 1 info-stealer record',
    ])
    expect(section.remediation.headline).toMatch(/malware/i)
    // The masked credential fingerprints must never reach the PDF model.
    const blob = JSON.stringify(model)
    expect(blob).not.toMatch(/\*{2,}/)
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
