// Shape of a single platform entry in Sherlock's data.json, plus the derived
// types used by the username check. Only the fields we actually consume are
// typed; Sherlock entries carry more (rank, request headers, etc.).

export interface SherlockEntry {
  url: string
  urlMain: string
  urlProbe?: string
  username_claimed: string
  errorType: 'status_code' | 'message' | 'response_url'
  errorMsg?: string | string[]
  errorUrl?: string
  errorCode?: number | number[]
  regexCheck?: string
  request_method?: string
  request_payload?: unknown
  headers?: Record<string, string>
}

/** A platform entry with its name attached, as the loader yields it. */
export interface Platform extends SherlockEntry {
  name: string
}

export type SherlockData = Record<string, SherlockEntry>

/** The minimal probe outcome the classifier reasons over (keeps it pure). */
export interface ProbeResult {
  status: number
  finalUrl: string
  body: string
}

/** A confirmed/denied presence for one platform. */
export interface UsernameResult {
  name: string
  url: string
  urlMain: string
  /** true = profile exists, false = absent, null = check failed/skipped. */
  found: boolean | null
}
