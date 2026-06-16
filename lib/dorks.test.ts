import { describe, it, expect } from 'vitest'
import { normaliseDomain, buildDorks } from './dorks'

describe('normaliseDomain', () => {
  it('accepts a bare domain', () => {
    expect(normaliseDomain('example.co.nz')).toBe('example.co.nz')
  })

  it('strips scheme, www, path, port and query', () => {
    expect(normaliseDomain('https://www.Example.co.nz:443/about?x=1')).toBe(
      'example.co.nz',
    )
  })

  it('extracts the domain from an email address', () => {
    expect(normaliseDomain('jane@example.co.nz')).toBe('example.co.nz')
  })

  it('rejects non-domains', () => {
    for (const v of ['', 'not a domain', 'localhost', 'example', undefined, null]) {
      expect(normaliseDomain(v)).toBeNull()
    }
  })
})

describe('buildDorks', () => {
  const cats = buildDorks('example.co.nz')

  it('returns multiple categories each with links', () => {
    expect(cats.length).toBeGreaterThan(3)
    expect(cats.every((c) => c.links.length > 0)).toBe(true)
  })

  it('embeds the domain in queries and builds encoded Google URLs', () => {
    const pdf = cats[0].links[0]
    expect(pdf.query).toContain('site:example.co.nz')
    expect(pdf.url).toBe(
      'https://www.google.com/search?q=' +
        encodeURIComponent('site:example.co.nz filetype:pdf'),
    )
  })

  it('every link has plain-English label, rationale, query and url', () => {
    for (const c of cats) {
      for (const l of c.links) {
        expect(l.label).toBeTruthy()
        expect(l.why).toBeTruthy()
        expect(l.query).toBeTruthy()
        expect(l.url.startsWith('https://www.google.com/search?q=')).toBe(true)
      }
    }
  })
})
