import { describe, it, expect } from 'vitest'
import { stripHtml } from './format'

describe('stripHtml', () => {
  it('removes tags and keeps the text content', () => {
    expect(
      stripHtml('In <a href="https://x.com" target="_blank">May 2016</a>, LinkedIn was breached.'),
    ).toBe('In May 2016, LinkedIn was breached.')
  })

  it('decodes common HTML entities', () => {
    expect(stripHtml('Tom &amp; Jerry said &quot;hi&quot;')).toBe('Tom & Jerry said "hi"')
  })

  it('neutralises a script tag to harmless text (no markup survives)', () => {
    const out = stripHtml('<script>alert(1)</script>danger')
    expect(out).toBe('alert(1)danger')
    expect(out).not.toContain('<')
  })

  it('collapses whitespace and trims', () => {
    expect(stripHtml('  lots\n\n  of   space  ')).toBe('lots of space')
  })
})
