import { describe, it, expect } from 'vitest'
import { fillPayload } from './check'

describe('fillPayload', () => {
  it('substitutes {} in string templates', () => {
    expect(fillPayload('user-{}', 'alice')).toBe('user-alice')
  })

  it('substitutes nested object/array templates', () => {
    expect(
      fillPayload({ query: { username: '{}' }, tags: ['{}', 'x'] }, 'bob'),
    ).toEqual({ query: { username: 'bob' }, tags: ['bob', 'x'] })
  })

  it('leaves non-string leaves untouched', () => {
    expect(fillPayload({ limit: 10, active: true }, 'bob')).toEqual({
      limit: 10,
      active: true,
    })
  })
})
