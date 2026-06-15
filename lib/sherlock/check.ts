import { classify } from './classify'
import type { Platform, UsernameResult } from './types'

// Checks a single platform for a username. Returns found=null when the platform
// can't be checked (username fails the platform's regex, or the request errors)
// — distinct from a confirmed absence (found=false).

const REQUEST_TIMEOUT_MS = 8000

// A realistic UA reduces trivially-blocked responses; checks still come from a
// datacentre IP, so some platforms will inevitably refuse. That's expected.
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (compatible; NZPrivacyAwareness/1.0; +https://github.com/karl-kb-tech/DataLeak)',
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
}

// Recursively substitutes "{}" with the (charset-validated) username inside a
// platform's request_payload template, so POST-based platforms get the username
// in their JSON body rather than only in the URL.
export function fillPayload(payload: unknown, username: string): unknown {
  if (typeof payload === 'string') return payload.replace('{}', username)
  if (Array.isArray(payload)) return payload.map((p) => fillPayload(p, username))
  if (payload && typeof payload === 'object') {
    return Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, fillPayload(v, username)]),
    )
  }
  return payload
}

export async function checkPlatform(
  platform: Platform,
  username: string,
): Promise<UsernameResult> {
  const url = platform.url.replace('{}', encodeURIComponent(username))
  const result: UsernameResult = {
    name: platform.name,
    url,
    urlMain: platform.urlMain,
    found: null,
  }

  // Skip platforms whose username rules this value can't satisfy.
  if (platform.regexCheck) {
    try {
      if (!new RegExp(platform.regexCheck).test(username)) return result
    } catch {
      // Bad regex in upstream data — fall through and attempt the check.
    }
  }

  const probeUrl = platform.urlProbe
    ? platform.urlProbe.replace('{}', encodeURIComponent(username))
    : url

  const method = platform.request_method ?? 'GET'
  const hasBody = method !== 'GET' && platform.request_payload != null

  try {
    const res = await fetch(probeUrl, {
      method,
      redirect: 'follow',
      headers: {
        ...DEFAULT_HEADERS,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...platform.headers,
      },
      body: hasBody
        ? JSON.stringify(fillPayload(platform.request_payload, username))
        : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    // Only message-type detection needs the body; avoid downloading it otherwise.
    const body = platform.errorType === 'message' ? await res.text() : ''
    result.found = classify(platform, {
      status: res.status,
      finalUrl: res.url,
      body,
    })
  } catch {
    result.found = null
  }

  return result
}
