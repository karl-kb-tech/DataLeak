// Shared, server-side input validation/normalisation for the API routes.
//
// NOTE: passwords are NOT validated here — the raw password never reaches the
// server. /api/password only ever validates a 5-char hash prefix (see
// validatePasswordPrefix). If a full password were being validated server-side,
// the implementation would already be wrong.

export type Validated<T> = { ok: true; value: T } | { ok: false }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_MAX_LEN = 254 // RFC 5321 maximum
// Conservative handle charset: starts alphanumeric, then [A-Za-z0-9._-], <=30.
const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/
const PREFIX_RE = /^[0-9A-F]{5}$/

/** Trim + lowercase, enforce length and shape. */
export function validateEmail(raw: unknown): Validated<string> {
  const email = String(raw ?? '').trim().toLowerCase()
  if (email.length > EMAIL_MAX_LEN || !EMAIL_RE.test(email)) return { ok: false }
  return { ok: true, value: email }
}

/** Strip leading '@'(s), then enforce the safe handle charset. */
export function validateUsername(raw: unknown): Validated<string> {
  const username = String(raw ?? '').trim().replace(/^@+/, '')
  if (!USERNAME_RE.test(username)) return { ok: false }
  return { ok: true, value: username }
}

/** Upper-case, enforce a 5-char hex prefix (HIBP k-anonymity range). */
export function validatePasswordPrefix(raw: unknown): Validated<string> {
  const prefix = String(raw ?? '').toUpperCase()
  if (!PREFIX_RE.test(prefix)) return { ok: false }
  return { ok: true, value: prefix }
}
