import { describe, it, expect } from 'vitest'
import { normaliseBreachName, mergeBreaches } from './dedupeBreaches'
import type { Breach } from './breaches/types'

describe('normaliseBreachName', () => {
  it('lowercases and strips punctuation/whitespace', () => {
    expect(normaliseBreachName('LinkedIn')).toBe('linkedin')
    expect(normaliseBreachName('Canva.com')).toBe('canvacom')
    expect(normaliseBreachName('Adobe ')).toBe('adobe')
  })

  it('strips years (even when glued to punctuation)', () => {
    expect(normaliseBreachName('Dropbox 2012')).toBe('dropbox')
    expect(normaliseBreachName('Collection #1 2019')).toBe('collection1')
    expect(normaliseBreachName('linkedin_2021')).toBe('linkedin')
  })

  it('applies known aliases on the post-normalised form', () => {
    expect(normaliseBreachName('MySpace.com')).toBe('myspace')
  })

  it('collapses cross-source variants to the same key', () => {
    expect(normaliseBreachName('LinkedIn')).toBe(normaliseBreachName('linkedin_2021'))
    expect(normaliseBreachName('MySpace.com')).toBe(normaliseBreachName('Myspace'))
  })
})

const breach = (over: Partial<Breach>): Breach => ({
  name: 'X',
  key: 'x',
  sources: [],
  ...over,
})

describe('mergeBreaches', () => {
  it('combines sources for the same breach', () => {
    const merged = mergeBreaches([
      breach({ name: 'LinkedIn', key: 'linkedin', sources: ['leakcheck'] }),
      breach({ name: 'LinkedIn', key: 'linkedin', sources: ['hibp'] }),
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].sources.sort()).toEqual(['hibp', 'leakcheck'])
  })

  it('fills missing fields from richer (HIBP) data', () => {
    const merged = mergeBreaches([
      breach({ key: 'adobe', sources: ['leakcheck'] }),
      breach({
        key: 'adobe',
        sources: ['hibp'],
        date: '2013-10-04',
        dataClasses: ['Email addresses', 'Passwords'],
        description: 'Adobe breach',
      }),
    ])
    expect(merged[0].date).toBe('2013-10-04')
    expect(merged[0].dataClasses).toEqual(['Email addresses', 'Passwords'])
  })

  it('keeps distinct breaches separate', () => {
    const merged = mergeBreaches([
      breach({ key: 'adobe', sources: ['hibp'] }),
      breach({ key: 'dropbox', sources: ['hibp'] }),
    ])
    expect(merged).toHaveLength(2)
  })

  it('does not mutate the input breaches', () => {
    const input = breach({ key: 'adobe', sources: ['leakcheck'] })
    mergeBreaches([input, breach({ key: 'adobe', sources: ['hibp'] })])
    expect(input.sources).toEqual(['leakcheck'])
  })
})
