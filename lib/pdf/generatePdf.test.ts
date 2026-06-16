import { describe, it, expect } from 'vitest'
import { renderReport } from './generatePdf'
import { buildReport } from '@/lib/report'

// Smoke test for the egress path: rendering a report through jsPDF must not
// throw and must produce a real document. We test renderReport (pure of file
// I/O) rather than downloadReport so nothing touches disk and we avoid mocking
// jsPDF's dynamically-defined save().

describe('renderReport', () => {
  it('renders a full, multi-section report into a document', () => {
    const model = buildReport(
      {
        password: { pwned: true, count: 4210 },
        breach: {
          email: 'a@b.com',
          breaches: [
            { name: 'LinkedIn', title: 'LinkedIn', date: '2021' },
            { name: 'Adobe', title: 'Adobe', date: '2013' },
          ],
          usedLeakCheck: true,
        },
        username: { username: 'octocat', hits: [{ name: 'GitHub' }, { name: 'Reddit' }] },
      },
      '16 June 2026, 9:00 am',
    )

    const doc = renderReport(model)
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })

  it('handles an empty report (no checks run)', () => {
    const model = buildReport({}, '16 June 2026, 9:00 am')
    const doc = renderReport(model)
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })
})
