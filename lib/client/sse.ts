// Client-side Server-Sent Events parsing for fetch-based streams.
//
// EventSource can't POST, and the username sweep needs a POST body (username +
// scope), so we read the response stream manually and parse SSE frames here.
// The frame parser is pure and unit-tested; readSSE wraps a ReadableStream.

export interface SSEFrame {
  event: string
  data: string
}

/**
 * Parse a single complete SSE frame (the text between blank lines). Returns
 * null for empty/comment-only frames. `data:` lines are concatenated with "\n"
 * per the SSE spec; a missing `event:` defaults to "message".
 */
export function parseSSEFrame(frame: string): SSEFrame | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const rawLine of frame.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (line === '' || line.startsWith(':')) continue
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    // A single leading space after the colon is stripped, per the spec.
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '')
    if (field === 'event') event = value
    else if (field === 'data') dataLines.push(value)
  }
  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

/**
 * Read an SSE response body, yielding parsed frames as they arrive. Buffers
 * partial frames across chunk boundaries.
 */
export async function* readSSE(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEFrame> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let sep: number
      // Frames are separated by a blank line ("\n\n").
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        const parsed = parseSSEFrame(frame)
        if (parsed) yield parsed
      }
    }
    // Flush any trailing frame not terminated by a blank line.
    const parsed = parseSSEFrame(buffer)
    if (parsed) yield parsed
  } finally {
    reader.releaseLock()
  }
}
