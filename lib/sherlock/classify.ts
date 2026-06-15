import type { SherlockEntry, ProbeResult } from './types'

// Pure hit/miss classification, mirroring Sherlock's three detection modes.
// Kept side-effect-free so it can be unit-tested without any network.
//
// Returns true when the username is PRESENT (profile exists) on the platform.

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return []
  return Array.isArray(v) ? v : [v]
}

function isOk(status: number): boolean {
  return status >= 200 && status < 300
}

export function classify(entry: SherlockEntry, probe: ProbeResult): boolean {
  switch (entry.errorType) {
    case 'status_code': {
      // If explicit error codes are listed, present = status not among them.
      // Otherwise present = a 2xx response.
      const codes = toArray(entry.errorCode)
      return codes.length > 0 ? !codes.includes(probe.status) : isOk(probe.status)
    }
    case 'message': {
      // Present unless any "not found" marker appears in the body.
      const markers = toArray(entry.errorMsg)
      return !markers.some((m) => probe.body.includes(m))
    }
    case 'response_url': {
      // Present unless the request was redirected to the platform's error URL.
      if (!entry.errorUrl) return isOk(probe.status)
      return probe.finalUrl !== entry.errorUrl
    }
    default:
      return false
  }
}
