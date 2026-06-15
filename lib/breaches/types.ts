// Shared shapes for the email-breach check. A Breach is the normalised,
// source-agnostic representation each upstream adapter maps its raw response
// into, so /api/breaches can merge them on a single de-dupe key.

export type BreachSource = 'hibp' | 'leakcheck' | 'xposedornot'

export interface Breach {
  /** Display name as the source reported it (e.g. "LinkedIn"). */
  name: string
  /** Normalised key used for cross-source de-duplication. */
  key: string
  title?: string
  /** Breach date — "YYYY" or "YYYY-MM-DD" depending on the source. */
  date?: string
  /** Kinds of data exposed (HIBP only). */
  dataClasses?: string[]
  description?: string
  /** Which upstream service(s) reported this breach. */
  sources: BreachSource[]
}

/** Per-source availability, surfaced to the UI's "show your working" panel. */
export interface SourceStatus {
  source: BreachSource
  ok: boolean
}
