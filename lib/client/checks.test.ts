import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  matchSuffix,
  checkPassword,
  checkBreaches,
  runUsernameSweep,
} from './checks'
import { BASE_PATH } from '@/lib/basePath'

describe('matchSuffix', () => {
  // HIBP returns "SUFFIX:COUNT" lines (suffix = SHA-1 minus the 5-char prefix).
  const body = 'AAAA:3\nBBBBCCCC:120\nDDDD:0'

  it('reports pwned with the count when the suffix is present', () => {
    expect(matchSuffix(body, 'BBBBCCCC')).toEqual({ pwned: true, count: 120 })
  })

  it('is case-insensitive on the suffix', () => {
    expect(matchSuffix(body, 'bbbbcccc')).toEqual({ pwned: true, count: 120 })
  })

  it('treats a zero count as not pwned', () => {
    expect(matchSuffix(body, 'DDDD')).toEqual({ pwned: false, count: 0 })
  })

  it('returns not-pwned when the suffix is absent', () => {
    expect(matchSuffix(body, 'FFFF')).toEqual({ pwned: false, count: 0 })
  })
})

describe('checkPassword (k-anonymity)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends only the 5-char prefix, never the password', async () => {
    // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response('1E4C9B93F3F0682250B6CF8331B7EE68FD8:42', { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await checkPassword('password')

    expect(result).toEqual({ pwned: true, count: 42 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_PATH}/api/password`)
    const sent = JSON.parse((init as RequestInit).body as string)
    expect(sent).toEqual({ prefix: '5BAA6' })
    // The password must never appear anywhere in the request body.
    expect((init as RequestInit).body).not.toContain('password')
  })
})

describe('checkBreaches', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the email and returns the parsed payload', async () => {
    const payload = { breaches: [], sources: [], hibpEnabled: false }
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => Response.json(payload),
    )
    vi.stubGlobal('fetch', fetchMock)

    expect(await checkBreaches('a@b.com')).toEqual(payload)
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(sent).toEqual({ email: 'a@b.com' })
  })
})

function sseResponse(frames: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const f of frames) controller.enqueue(encoder.encode(f))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

describe('runUsernameSweep', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('dispatches progress/hit/done events to handlers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse([
          'event: progress\ndata: {"checked":1,"total":2}\n\n',
          'event: hit\ndata: {"name":"GitHub","url":"u","urlMain":"m"}\n\n',
          'event: done\ndata: {"platformsChecked":2,"hits":1,"unreachable":0}\n\n',
        ]),
      ),
    )

    const hits: unknown[] = []
    let done: unknown
    let lastProgress: [number, number] | undefined
    await runUsernameSweep('octocat', 'curated', {
      onProgress: (c, t) => (lastProgress = [c, t]),
      onHit: (h) => hits.push(h),
      onDone: (d) => (done = d),
    })

    expect(lastProgress).toEqual([1, 2])
    expect(hits).toEqual([{ name: 'GitHub', url: 'u', urlMain: 'm' }])
    expect(done).toEqual({ platformsChecked: 2, hits: 1, unreachable: 0 })
  })

  it('calls onError when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })))
    let err: string | undefined
    await runUsernameSweep('x', 'all', { onError: (e) => (err = e) })
    expect(err).toBe('username_check_failed')
  })
})
