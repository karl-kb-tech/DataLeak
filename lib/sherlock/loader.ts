import { createHash } from 'node:crypto'
import bundled from './data/data.json'
import type { Platform, SherlockData } from './types'

// Loads Sherlock platform definitions. Strategy:
//   1. Start from the snapshot bundled in the repo (always available, offline).
//   2. Once per module lifetime, fetch upstream and SHA-256 it. If it differs
//      from the bundled snapshot's hash, the upstream changed — use the fresher
//      copy. Otherwise keep the bundled one.
//
// The "fresher" copy lives only in module memory (warm-lambda cache); a cold
// start re-checks. This is a static platform list, not user data, so caching it
// does not touch the tool's ephemerality guarantee.
//
// IMPORTANT: when refreshing the bundled snapshot, update BUNDLED_SHA256 to the
// new file's hash (sha256sum lib/sherlock/data/data.json).

const UPSTREAM =
  'https://raw.githubusercontent.com/sherlock-project/sherlock/master/sherlock_project/resources/data.json'
const BUNDLED_SHA256 =
  '3fdfc6694c5cd99798881215554b09e617c6d5284a6219fae309882566a9fb30'
const REFRESH_TIMEOUT_MS = 3000

function toPlatforms(data: SherlockData): Platform[] {
  return Object.entries(data)
    .filter(([name]) => name !== '$schema')
    .map(([name, entry]) => ({ name, ...entry }))
}

let cache: Promise<Platform[]> | null = null

async function load(): Promise<Platform[]> {
  const fallback = toPlatforms(bundled as unknown as SherlockData)
  try {
    const res = await fetch(UPSTREAM, {
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    })
    if (!res.ok) return fallback
    const text = await res.text()
    const hash = createHash('sha256').update(text).digest('hex')
    if (hash === BUNDLED_SHA256) return fallback
    return toPlatforms(JSON.parse(text) as SherlockData)
  } catch {
    // Offline, slow, or malformed upstream — the bundled snapshot is fine.
    return fallback
  }
}

/** Returns the platform list, memoised for this module's lifetime. */
export function getPlatforms(): Promise<Platform[]> {
  if (!cache) cache = load()
  return cache
}
