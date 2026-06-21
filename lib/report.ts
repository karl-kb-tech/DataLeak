// Pure builder for the downloadable report's content model. Kept separate from
// the jsPDF rendering so the structure/copy is unit-testable and the same model
// could drive any output format. No data is read from anywhere global — the
// caller passes in exactly the results to include, so nothing leaks in.

import {
  passwordRemediation,
  breachRemediation,
  usernameRemediation,
  infectionRemediation,
  type Remediation,
} from '@/lib/remediation'

export interface ReportInput {
  password?: { pwned: boolean; count: number }
  breach?: {
    email: string
    breaches: { name: string; title?: string; date?: string }[]
    usedLeakCheck: boolean
  }
  infections?: {
    sent: string
    infected: boolean
    // High-level only — masked credentials are deliberately NOT carried into the
    // PDF (the report is the one egress path; masked values are partial
    // fingerprints).
    targets: { target: string; records: number; lastCompromised?: string }[]
  }
  username?: { username: string; hits: { name: string }[] }
}

export interface ReportSection {
  title: string
  /** What was sent upstream for this check (transparency). */
  sent?: string
  remediation: Remediation
  /** Detail lines (breach names, platforms found). */
  findings: string[]
}

export interface ReportModel {
  title: string
  generatedAt: string
  intro: string
  sections: ReportSection[]
  attributions: string[]
  disclaimer: string
}

const DISCLAIMER =
  'This report is a privacy awareness aid, not a penetration-testing or ' +
  'people-search service. It reflects only the sources checked at the time ' +
  'shown and is not a guarantee of safety. Nothing you entered was stored — ' +
  'this document was generated in your browser.'

const INTRO =
  'This is a snapshot of what is publicly findable about the details you ' +
  'checked — the same kind of open-source information (OSINT) an attacker ' +
  'would gather. Each section below pairs what was found with simple steps to ' +
  'reduce your exposure.'

export function buildReport(input: ReportInput, generatedAt: string): ReportModel {
  const sections: ReportSection[] = []
  const attributions: string[] = []

  if (input.password) {
    sections.push({
      title: 'Password exposure',
      sent: 'an anonymous 5-character fragment (never the password itself)',
      remediation: passwordRemediation(input.password.pwned, input.password.count),
      findings: [],
    })
  }

  if (input.breach) {
    sections.push({
      title: 'Email in data breaches',
      sent: input.breach.email,
      remediation: breachRemediation(input.breach.breaches.length),
      findings: input.breach.breaches.map((b) =>
        b.date ? `${b.title ?? b.name} (${b.date})` : (b.title ?? b.name),
      ),
    })
    if (input.breach.usedLeakCheck) {
      attributions.push('Breach data powered by LeakCheck (leakcheck.io).')
    }
  }

  if (input.infections) {
    sections.push({
      title: 'Info-stealer malware exposure',
      sent: input.infections.sent,
      remediation: infectionRemediation(input.infections.infected),
      // High-level counts only — never the masked credentials themselves.
      findings: input.infections.targets.map((t) => {
        const records = `${t.records} info-stealer record${t.records === 1 ? '' : 's'}`
        return t.lastCompromised
          ? `${t.target}: found in ${records} (most recent ${t.lastCompromised})`
          : `${t.target}: found in ${records}`
      }),
    })
  }

  if (input.username) {
    sections.push({
      title: 'Username footprint',
      sent: input.username.username,
      remediation: usernameRemediation(input.username.hits.length),
      findings: input.username.hits.map((h) => h.name),
    })
  }

  return {
    title: 'Your digital footprint report',
    generatedAt,
    intro: INTRO,
    sections,
    attributions,
    disclaimer: DISCLAIMER,
  }
}
