import { describe, it, expect, vi, afterEach } from 'vitest'
import { searchByEmail, searchByUsername, searchByDomain } from './hudsonrock'

afterEach(() => vi.unstubAllGlobals())

function mockJson(body: unknown, status = 200) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('searchByEmail / searchByUsername', () => {
  it('maps masked credentials through and reports a hit', async () => {
    mockJson({
      message: 'This email is associated with a stealer infection',
      total_user_services: 4,
      total_corporate_services: 1,
      stealers: [
        {
          date_compromised: '2026-06-15T00:00:00.000Z',
          antiviruses: ['Windows Defender'],
          top_passwords: ['K******5', 'h*****3'],
          top_logins: ['j***@example.com'],
        },
      ],
    })
    const match = await searchByEmail('test@example.com')
    expect(match.found).toBe(true)
    expect(match.type).toBe('email')
    expect(match.totalUserServices).toBe(4)
    expect(match.stealers[0].topPasswords).toEqual(['K******5', 'h*****3'])
    expect(match.stealers[0].topLogins).toEqual(['j***@example.com'])
    expect(match.stealers[0].dateCompromised).toBe('2026-06-15T00:00:00.000Z')
  })

  it('maps "Not Found" sentinel fields to undefined', async () => {
    mockJson({
      stealers: [
        {
          date_compromised: 'Not Found',
          antiviruses: 'Not Found',
          top_passwords: ['x*****1'],
          top_logins: 'Not Found',
        },
      ],
    })
    const match = await searchByUsername('octocat')
    expect(match.type).toBe('username')
    expect(match.found).toBe(true)
    expect(match.stealers[0].dateCompromised).toBeUndefined()
    expect(match.stealers[0].antiviruses).toBeUndefined()
    expect(match.stealers[0].topLogins).toBeUndefined()
    expect(match.stealers[0].topPasswords).toEqual(['x*****1'])
  })

  it('treats an empty/absent stealers list as not found', async () => {
    mockJson({ message: 'No results' })
    const match = await searchByEmail('clean@example.com')
    expect(match.found).toBe(false)
    expect(match.stealers).toEqual([])
  })

  it('throws on a non-ok response', async () => {
    mockJson({}, 500)
    await expect(searchByEmail('test@example.com')).rejects.toThrow(/500/)
  })
})

describe('searchByDomain', () => {
  it('maps aggregate stats, families and urls; drops the families "total" key', async () => {
    mockJson({
      total: 42,
      employees: 5,
      users: 30,
      third_parties: 7,
      last_user_compromised: '2026-05-01T00:00:00.000Z',
      last_employee_compromised: '1970-01-01T00:00:00.000Z',
      stealerFamilies: { total: 42, Lumma: 16, 'Generic Stealer': 10 },
      userPasswords: {
        too_weak: { qty: 12 },
        weak: { qty: 8 },
        medium: { qty: 6 },
        strong: { qty: 4 },
      },
      data: {
        clients_urls: [{ url: 'https://login.example.com', occurrence: 9 }],
        employees_urls: [{ url: 'Not Found', occurrence: 0 }],
      },
    })
    const intel = await searchByDomain('example.com')
    expect(intel.found).toBe(true)
    expect(intel.total).toBe(42)
    expect(intel.users).toBe(30)
    expect(intel.lastUserCompromised).toBe('2026-05-01T00:00:00.000Z')
    // Epoch-zero placeholder must be dropped.
    expect(intel.lastEmployeeCompromised).toBeUndefined()
    // "total" is an aggregate, not a family — and result is sorted desc.
    expect(intel.stealerFamilies).toEqual([
      { name: 'Lumma', count: 16 },
      { name: 'Generic Stealer', count: 10 },
    ])
    expect(intel.userPasswordStrength).toEqual({
      tooWeak: 12,
      weak: 8,
      medium: 6,
      strong: 4,
    })
    expect(intel.clientUrls).toEqual([
      { url: 'https://login.example.com', occurrence: 9 },
    ])
    // "Not Found" url filtered out.
    expect(intel.employeeUrls).toEqual([])
  })

  it('reports not found when total is zero', async () => {
    mockJson({ total: 0 })
    const intel = await searchByDomain('clean-domain.com')
    expect(intel.found).toBe(false)
    expect(intel.total).toBe(0)
  })

  it('throws on a non-ok response', async () => {
    mockJson({}, 503)
    await expect(searchByDomain('example.com')).rejects.toThrow(/503/)
  })
})
