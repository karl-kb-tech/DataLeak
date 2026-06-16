// Builds Google "dork" search links for an organisation's domain — the kind of
// queries an attacker runs to map what an org has unintentionally exposed.
//
// This is 100% client-side URL construction: we never query Google ourselves
// (that would be scraping + get blocked), we hand the user ready-made search
// links to click. Nothing is sent anywhere, nothing is stored — it stays within
// the tool's ephemerality + "show your working" model.
//
// Framing matters: this is for searching a domain you are AUTHORISED to assess
// (your own org, with consent), as an awareness exercise — not bulk recon.

export interface DorkLink {
  /** Plain-English description of what this surfaces. */
  label: string
  /** Why it matters — the training tie-in. */
  why: string
  /** The raw Google query (shown to the user — transparency). */
  query: string
  /** Ready-to-click Google search URL. */
  url: string
}

export interface DorkCategory {
  title: string
  links: DorkLink[]
}

const DOMAIN_RE = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

/**
 * Normalise user input to a bare domain (strip scheme, www, path, @, port).
 * Returns null if it doesn't look like a domain.
 */
export function normaliseDomain(raw: unknown): string | null {
  let value = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '') // scheme
    .replace(/^.*@/, '') // anything before an @ (e.g. an email)
    .replace(/[/?#].*$/, '') // path/query/fragment
    .replace(/:\d+$/, '') // port
  if (value.startsWith('www.')) value = value.slice(4)
  return DOMAIN_RE.test(value) ? value : null
}

function googleUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

function link(label: string, why: string, query: string): DorkLink {
  return { label, why, query, url: googleUrl(query) }
}

/**
 * Build the categorised dork link set for a (pre-normalised) domain.
 */
export function buildDorks(domain: string): DorkCategory[] {
  const q = domain
  return [
    {
      title: 'Exposed documents',
      links: [
        link(
          'Published PDFs',
          'Reports, letters and forms often carry names, emails and internal detail in their text or metadata.',
          `site:${q} filetype:pdf`,
        ),
        link(
          'Spreadsheets',
          'Spreadsheets frequently contain staff lists, contact details or data never meant to be public.',
          `site:${q} (filetype:xls OR filetype:xlsx OR filetype:csv)`,
        ),
        link(
          'Word documents',
          'Documents leak author names and revision history in their metadata.',
          `site:${q} (filetype:doc OR filetype:docx)`,
        ),
      ],
    },
    {
      title: 'Open directories & sensitive files',
      links: [
        link(
          'Open file listings',
          'A misconfigured server can list its files publicly — a goldmine for an attacker.',
          `site:${q} intitle:"index of"`,
        ),
        link(
          'Config, log & backup files',
          'These can expose passwords, keys and internal structure if served by mistake.',
          `site:${q} (ext:env OR ext:log OR ext:bak OR ext:sql)`,
        ),
      ],
    },
    {
      title: 'Login & admin portals',
      links: [
        link(
          'Login and admin pages',
          'Knowing where staff log in tells an attacker exactly where to aim phishing or password attacks.',
          `site:${q} (inurl:login OR inurl:admin OR intitle:login)`,
        ),
      ],
    },
    {
      title: 'Staff & email exposure',
      links: [
        link(
          'Email addresses on the web',
          'Published work emails feed targeted phishing and credential-stuffing.',
          `"@${q}"`,
        ),
        link(
          'Staff on LinkedIn',
          'Public employee profiles reveal names, roles and reporting lines used to craft convincing pretexts.',
          `site:linkedin.com "${q}"`,
        ),
      ],
    },
    {
      title: 'Code & paste leaks',
      links: [
        link(
          'Mentions in public code',
          'Developers sometimes commit internal URLs, emails or secrets that reference the domain.',
          `site:github.com "${q}"`,
        ),
        link(
          'Mentions in public pastes',
          'Leaked credentials and dumps are often posted to paste sites.',
          `(site:pastebin.com OR site:ghostbin.com) "${q}"`,
        ),
      ],
    },
    {
      title: 'Cloud storage & shared docs',
      links: [
        link(
          'Public cloud buckets',
          'Misconfigured storage buckets can expose entire datasets to anyone.',
          `(site:s3.amazonaws.com OR site:blob.core.windows.net) "${q}"`,
        ),
        link(
          'Shared Google Docs & Trello boards',
          'Documents and project boards set to "anyone with the link" get indexed and found.',
          `(site:docs.google.com OR site:trello.com) "${q}"`,
        ),
      ],
    },
  ]
}
