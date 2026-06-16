import { describe, it, expect } from 'vitest'
import { parseSSEFrame, readSSE } from './sse'

describe('parseSSEFrame', () => {
  it('parses event and data fields', () => {
    expect(parseSSEFrame('event: hit\ndata: {"name":"GitHub"}')).toEqual({
      event: 'hit',
      data: '{"name":"GitHub"}',
    })
  })

  it('defaults event to "message" when absent', () => {
    expect(parseSSEFrame('data: hello')).toEqual({ event: 'message', data: 'hello' })
  })

  it('strips a single leading space and concatenates multi-line data', () => {
    expect(parseSSEFrame('data: a\ndata: b')).toEqual({ event: 'message', data: 'a\nb' })
  })

  it('ignores comment lines and tolerates CRLF', () => {
    expect(parseSSEFrame(': keepalive\r\nevent: done\r\ndata: {}\r')).toEqual({
      event: 'done',
      data: '{}',
    })
  })

  it('returns null for frames with no data', () => {
    expect(parseSSEFrame(': just a comment')).toBeNull()
    expect(parseSSEFrame('')).toBeNull()
  })
})

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
}

describe('readSSE', () => {
  it('yields frames split across chunk boundaries', async () => {
    const stream = streamOf([
      'event: progress\ndata: {"checked":1}',
      '\n\nevent: hit\nda',
      'ta: {"name":"X"}\n\n',
    ])
    const frames = []
    for await (const f of readSSE(stream)) frames.push(f)
    expect(frames).toEqual([
      { event: 'progress', data: '{"checked":1}' },
      { event: 'hit', data: '{"name":"X"}' },
    ])
  })

  it('flushes a trailing frame with no terminating blank line', async () => {
    const frames = []
    for await (const f of readSSE(streamOf(['event: done\ndata: {}']))) frames.push(f)
    expect(frames).toEqual([{ event: 'done', data: '{}' }])
  })
})
