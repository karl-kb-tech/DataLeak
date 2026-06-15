import { describe, it, expect } from 'vitest'
import { classify } from './classify'
import type { SherlockEntry, ProbeResult } from './types'

const probe = (over: Partial<ProbeResult>): ProbeResult => ({
  status: 200,
  finalUrl: 'https://example.com/user',
  body: '',
  ...over,
})

describe('classify — status_code', () => {
  const entry: SherlockEntry = {
    url: 'https://x/{}',
    urlMain: 'https://x',
    username_claimed: 'a',
    errorType: 'status_code',
  }

  it('present on 2xx', () => {
    expect(classify(entry, probe({ status: 200 }))).toBe(true)
  })
  it('absent on 404', () => {
    expect(classify(entry, probe({ status: 404 }))).toBe(false)
  })
  it('honours explicit errorCode list', () => {
    const e = { ...entry, errorCode: 200 }
    expect(classify(e, probe({ status: 200 }))).toBe(false)
    expect(classify(e, probe({ status: 302 }))).toBe(true)
  })
})

describe('classify — message', () => {
  const entry: SherlockEntry = {
    url: 'https://x/{}',
    urlMain: 'https://x',
    username_claimed: 'a',
    errorType: 'message',
    errorMsg: 'User not found',
  }

  it('absent when marker present in body', () => {
    expect(classify(entry, probe({ body: '<h1>User not found</h1>' }))).toBe(false)
  })
  it('present when marker absent', () => {
    expect(classify(entry, probe({ body: '<h1>Welcome</h1>' }))).toBe(true)
  })
  it('handles an array of markers', () => {
    const e = { ...entry, errorMsg: ['nope', 'not found'] }
    expect(classify(e, probe({ body: 'page not found here' }))).toBe(false)
    expect(classify(e, probe({ body: 'all good' }))).toBe(true)
  })
})

describe('classify — response_url', () => {
  const entry: SherlockEntry = {
    url: 'https://x/{}',
    urlMain: 'https://x',
    username_claimed: 'a',
    errorType: 'response_url',
    errorUrl: 'https://x/404',
  }

  it('absent when redirected to errorUrl', () => {
    expect(classify(entry, probe({ finalUrl: 'https://x/404' }))).toBe(false)
  })
  it('present when not redirected to errorUrl', () => {
    expect(classify(entry, probe({ finalUrl: 'https://x/cooluser' }))).toBe(true)
  })

  it('treats trailing-slash differences as the same error URL (still absent)', () => {
    expect(classify(entry, probe({ finalUrl: 'https://x/404/' }))).toBe(false)
  })
})
