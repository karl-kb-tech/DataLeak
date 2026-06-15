import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Guard for the project's ephemerality constraint: no logging of anything,
// anywhere in app/ or lib/. This fails the build if a console.* (or other
// logging) call sneaks into source. Test files are excluded.

const ROOTS = ['app', 'lib']
const SKIP_FILE = /\.test\.ts$/
const FORBIDDEN = /\bconsole\s*\.\s*(log|info|warn|error|debug|trace)\b/

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full))
    } else if (/\.tsx?$/.test(entry) && !SKIP_FILE.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe('no logging in source', () => {
  it('contains no console.* calls in app/ or lib/', () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of sourceFiles(root)) {
        if (FORBIDDEN.test(readFileSync(file, 'utf8'))) offenders.push(file)
      }
    }
    expect(offenders, `logging found in: ${offenders.join(', ')}`).toEqual([])
  })
})
