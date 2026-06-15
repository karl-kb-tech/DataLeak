// CLIENT-SIDE ONLY. Never import this into a server route.
//
// Hashes a password with the native Web Crypto API and returns the 5-char
// SHA-1 prefix (sent to /api/password) and the remaining suffix (matched
// client-side against HIBP's response). The password itself never leaves the
// browser.

export interface HashedPassword {
  prefix: string
  suffix: string
}

export async function hashPassword(password: string): Promise<HashedPassword> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  return {
    prefix: hashHex.slice(0, 5),
    suffix: hashHex.slice(5),
  }
}
