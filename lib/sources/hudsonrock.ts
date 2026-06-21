// Hudson Rock Cavalier OSINT API — keyless and free to use (Hudson Rock promotes
// these endpoints publicly as "complimentary data"). Unlike LeakCheck/XposedOrNot
// (which report data *breaches*), this reports devices infected by info-stealer
// *malware* that exfiltrated saved credentials — a different, high-signal kind of
// exposure. Credentials come pre-masked from the source (e.g. "K******5"), so we
// never relay cleartext.
//
// A good-faith "Powered by Hudson Rock" attribution is shown wherever results
// appear — not contractually required, but in keeping with show-your-working.
const BASE = 'https://cavalier.hudsonrock.com/api/json/v2/osint-tools'

// The free tier returns "Not Found" sentinels for the device-identifying fields
// (computer name, OS, malware path, IP). Treat those as absent so the UI can omit
// them rather than render the literal string.
const NOT_FOUND = 'Not Found'

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === NOT_FOUND) return undefined
  return trimmed
}

// Domain "last compromised" timestamps come back as the Unix epoch (1970-...)
// when there is nothing to report. Drop those so callers don't show a 1970 date.
function cleanDate(value: unknown): string | undefined {
  const str = clean(value)
  if (!str || str.startsWith('1970')) return undefined
  return str
}

export interface StealerRecord {
  dateCompromised?: string
  /** Antivirus software present on the infected machine (teachable: it didn't stop the theft). */
  antiviruses?: string[]
  /** Masked at source — enough to recognise your own, not enough to reuse. */
  topPasswords?: string[]
  /** Masked at source (logins/emails saved on the infected machine). */
  topLogins?: string[]
}

export interface InfectionMatch {
  target: string
  type: 'email' | 'username'
  found: boolean
  message?: string
  /** Total personal-service accounts caught in the dump (across all records). */
  totalUserServices?: number
  /** Total corporate-service accounts caught in the dump. */
  totalCorporateServices?: number
  stealers: StealerRecord[]
}

export interface PasswordStrength {
  tooWeak: number
  weak: number
  medium: number
  strong: number
}

export interface DomainIntel {
  domain: string
  found: boolean
  /** Infected machines tied to this domain in Hudson Rock's dataset. */
  total: number
  /** ...with a corporate (@domain) login. */
  employees: number
  /** ...with a customer/user login for the domain. */
  users: number
  thirdParties: number
  lastUserCompromised?: string
  lastEmployeeCompromised?: string
  stealerFamilies: { name: string; count: number }[]
  userPasswordStrength?: PasswordStrength
  employeePasswordStrength?: PasswordStrength
  /** Customer-facing login URLs seen in the logs (entry points with stolen creds). */
  clientUrls: { url: string; occurrence: number }[]
  employeeUrls: { url: string; occurrence: number }[]
}

interface RawStealer {
  date_compromised?: string
  antiviruses?: unknown
  top_passwords?: unknown
  top_logins?: unknown
}

interface RawInfectionResponse {
  message?: string
  stealers?: RawStealer[]
  total_user_services?: number
  total_corporate_services?: number
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.map((v) => clean(v)).filter((v): v is string => Boolean(v))
  return items.length > 0 ? items : undefined
}

function mapStealer(raw: RawStealer): StealerRecord {
  return {
    dateCompromised: cleanDate(raw.date_compromised),
    antiviruses: asStringArray(raw.antiviruses),
    topPasswords: asStringArray(raw.top_passwords),
    topLogins: asStringArray(raw.top_logins),
  }
}

async function searchInfection(
  endpoint: string,
  param: string,
  target: string,
  type: 'email' | 'username',
): Promise<InfectionMatch> {
  const url = `${BASE}/${endpoint}?${param}=${encodeURIComponent(target)}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Hudson Rock responded ${res.status}`)

  const data = (await res.json()) as RawInfectionResponse
  const stealers = Array.isArray(data.stealers) ? data.stealers.map(mapStealer) : []
  return {
    target,
    type,
    found: stealers.length > 0,
    message: clean(data.message),
    totalUserServices: data.total_user_services,
    totalCorporateServices: data.total_corporate_services,
    stealers,
  }
}

export function searchByEmail(email: string): Promise<InfectionMatch> {
  return searchInfection('search-by-email', 'email', email, 'email')
}

export function searchByUsername(username: string): Promise<InfectionMatch> {
  return searchInfection('search-by-username', 'username', username, 'username')
}

interface RawBucket {
  qty?: number
  perc?: number
}
interface RawPasswords {
  too_weak?: RawBucket
  weak?: RawBucket
  medium?: RawBucket
  strong?: RawBucket
}
interface RawUrl {
  url?: string
  occurrence?: number
}
interface RawDomainResponse {
  total?: number
  employees?: number
  users?: number
  third_parties?: number
  last_user_compromised?: string
  last_employee_compromised?: string
  stealerFamilies?: Record<string, unknown>
  userPasswords?: RawPasswords
  employeePasswords?: RawPasswords
  data?: { clients_urls?: RawUrl[]; employees_urls?: RawUrl[] }
}

function mapStrength(raw: RawPasswords | undefined): PasswordStrength | undefined {
  if (!raw) return undefined
  return {
    tooWeak: raw.too_weak?.qty ?? 0,
    weak: raw.weak?.qty ?? 0,
    medium: raw.medium?.qty ?? 0,
    strong: raw.strong?.qty ?? 0,
  }
}

function mapUrls(raw: RawUrl[] | undefined): { url: string; occurrence: number }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((u) => ({ url: clean(u.url), occurrence: u.occurrence ?? 0 }))
    .filter((u): u is { url: string; occurrence: number } => Boolean(u.url))
}

// stealerFamilies arrives as { total: N, "Lumma": 10, "Generic Stealer": 16 };
// the `total` key is an aggregate, not a family — drop it.
function mapFamilies(raw: Record<string, unknown> | undefined): { name: string; count: number }[] {
  if (!raw) return []
  return Object.entries(raw)
    .filter(([name, count]) => name !== 'total' && typeof count === 'number')
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count)
}

export async function searchByDomain(domain: string): Promise<DomainIntel> {
  const url = `${BASE}/search-by-domain?domain=${encodeURIComponent(domain)}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Hudson Rock responded ${res.status}`)

  const data = (await res.json()) as RawDomainResponse
  const total = data.total ?? 0
  return {
    domain,
    found: total > 0,
    total,
    employees: data.employees ?? 0,
    users: data.users ?? 0,
    thirdParties: data.third_parties ?? 0,
    lastUserCompromised: cleanDate(data.last_user_compromised),
    lastEmployeeCompromised: cleanDate(data.last_employee_compromised),
    stealerFamilies: mapFamilies(data.stealerFamilies),
    userPasswordStrength: mapStrength(data.userPasswords),
    employeePasswordStrength: mapStrength(data.employeePasswords),
    clientUrls: mapUrls(data.data?.clients_urls),
    employeeUrls: mapUrls(data.data?.employees_urls),
  }
}
