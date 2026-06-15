// Normalises and de-dupes breach results merged from LeakCheck and XposedOrNot.
//
// Breach names are not standardised across services. First pass: lowercase and
// strip punctuation/years. Then apply a known-aliases map for common
// discrepancies. When in doubt, prefer showing a duplicate over silently
// dropping a result.

// Common cross-service name discrepancies. Extend as new mismatches surface.
export const BREACH_ALIASES: Record<string, string> = {
  linkedin_2021: 'linkedin',
}

export function normaliseBreachName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, '') // strip years
    .replace(/[^a-z0-9]/g, '') // strip punctuation/whitespace
    .trim()
  return BREACH_ALIASES[base] ?? base
}
