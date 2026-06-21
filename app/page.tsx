'use client'

import { useRef, useState } from 'react'
import { Disclaimer } from '@/components/Disclaimer'
import { OsintIntro } from '@/components/OsintIntro'
import { DomainSearch } from '@/components/DomainSearch'
import { CheckForm, type CheckInput } from '@/components/CheckForm'
import {
  PasswordResult,
  BreachResult,
  InfectionResult,
  UsernameResult,
  type Slot,
  type UsernameState,
} from '@/components/Results'
import {
  checkPassword,
  checkBreaches,
  checkInfections,
  runUsernameSweep,
  type PasswordCheck,
  type BreachCheck,
  type InfectionCheck,
} from '@/lib/client/checks'
import { buildReport, type ReportInput } from '@/lib/report'

// Most recent infection date across a match's records, formatted for the PDF.
// Records may carry no usable date (source sentinel mapped to undefined).
function latestCompromised(
  stealers: { dateCompromised?: string }[],
): string | undefined {
  const dates = stealers
    .map((s) => s.dateCompromised)
    .filter((d): d is string => Boolean(d))
    .sort()
  const latest = dates[dates.length - 1]
  if (!latest) return undefined
  const parsed = new Date(latest)
  return Number.isNaN(parsed.getTime())
    ? latest.slice(0, 10)
    : parsed.toLocaleDateString('en-NZ', { dateStyle: 'long' })
}

const IDLE_USERNAME: UsernameState = {
  status: 'idle',
  hits: [],
  checked: 0,
  total: 0,
}

export default function Home() {
  const [password, setPassword] = useState<Slot<PasswordCheck>>({ status: 'idle' })
  const [breach, setBreach] = useState<Slot<BreachCheck>>({ status: 'idle' })
  const [infections, setInfections] = useState<Slot<InfectionCheck>>({ status: 'idle' })
  const [username, setUsername] = useState<UsernameState>(IDLE_USERNAME)
  // Only the values the result cards need to echo back — never the password.
  const [shown, setShown] = useState({ email: '', username: '' })
  const abortRef = useRef<AbortController | null>(null)

  const running =
    password.status === 'running' ||
    breach.status === 'running' ||
    infections.status === 'running' ||
    username.status === 'running'

  function run(input: CheckInput) {
    // Cancel any in-flight username stream from a previous run.
    abortRef.current?.abort()
    setShown({ email: input.email, username: input.username })

    if (input.password) {
      setPassword({ status: 'running' })
      checkPassword(input.password)
        .then((data) => setPassword({ status: 'done', data }))
        .catch(() => setPassword({ status: 'error' }))
    } else {
      setPassword({ status: 'idle' })
    }

    if (input.email) {
      setBreach({ status: 'running' })
      checkBreaches(input.email)
        .then((data) => setBreach({ status: 'done', data }))
        .catch(() => setBreach({ status: 'error' }))
    } else {
      setBreach({ status: 'idle' })
    }

    // Hudson Rock info-stealer lookup covers both email and username. Run it
    // whenever either was entered; it's its own section, separate from breaches.
    if (input.email || input.username) {
      setInfections({ status: 'running' })
      checkInfections(input.email, input.username)
        .then((data) => setInfections({ status: 'done', data }))
        .catch(() => setInfections({ status: 'error' }))
    } else {
      setInfections({ status: 'idle' })
    }

    if (input.username) {
      const controller = new AbortController()
      abortRef.current = controller
      setUsername({ ...IDLE_USERNAME, status: 'running' })
      runUsernameSweep(input.username, input.scope, {
        signal: controller.signal,
        onProgress: (checked, total) =>
          setUsername((s) => ({ ...s, checked, total })),
        onHit: (hit) => setUsername((s) => ({ ...s, hits: [...s.hits, hit] })),
        onDone: (summary) =>
          setUsername((s) => ({ ...s, status: 'done', summary })),
        onError: () => setUsername((s) => ({ ...s, status: 'error' })),
      }).catch(() => setUsername((s) => ({ ...s, status: 'error' })))
    } else {
      setUsername(IDLE_USERNAME)
    }
  }

  // Wipe every result slot and the echoed-back inputs without waiting for the
  // tab to close — for shared/work machines. Also cancels any in-flight stream.
  function clearAll() {
    abortRef.current?.abort()
    setPassword({ status: 'idle' })
    setBreach({ status: 'idle' })
    setInfections({ status: 'idle' })
    setUsername(IDLE_USERNAME)
    setShown({ email: '', username: '' })
  }

  const hasResults =
    password.status !== 'idle' ||
    breach.status !== 'idle' ||
    infections.status !== 'idle' ||
    username.status !== 'idle'

  const canDownload =
    password.status === 'done' ||
    breach.status === 'done' ||
    infections.status === 'done' ||
    username.status === 'done'

  async function downloadPdf() {
    const input: ReportInput = {}
    if (password.status === 'done') input.password = password.data
    if (breach.status === 'done') {
      input.breach = {
        email: shown.email,
        breaches: breach.data.breaches,
        // LeakCheck ToS: attribution required wherever its results are shown.
        usedLeakCheck: breach.data.sources.some((s) => s.source === 'leakcheck'),
      }
    }
    if (infections.status === 'done') {
      const found = infections.data.matches.filter((m) => m.found)
      // High-level per-identifier summary only — the masked credentials shown
      // on-screen deliberately never make it into the PDF egress path.
      input.infections = {
        sent: [shown.email, shown.username].filter(Boolean).join(', '),
        infected: found.length > 0,
        targets: found.map((m) => ({
          target: m.target,
          records: m.stealers.length,
          lastCompromised: latestCompromised(m.stealers),
        })),
      }
    }
    if (username.status === 'done') {
      input.username = { username: shown.username, hits: username.hits }
    }
    const generatedAt = new Date().toLocaleString('en-NZ', {
      dateStyle: 'long',
      timeStyle: 'short',
    })
    // Lazy-load jsPDF so it stays out of the initial bundle.
    const { downloadReport } = await import('@/lib/pdf/generatePdf')
    downloadReport(buildReport(input, generatedAt))
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.35em] text-fuchsia-400 glow-magenta">
          NZ Privacy Awareness
        </p>
        <h1 className="text-2xl font-bold text-cyan-50 glow-cyan">
          Your digital footprint, in plain English
        </h1>
        <p className="mt-2 text-slate-400">
          See what is publicly findable about you, and get simple steps to reduce
          it. Nothing you enter is stored.
        </p>
      </header>

      <div className="space-y-8">
        <Disclaimer />
        <OsintIntro />
        <CheckForm onSubmit={run} running={running} />

        {hasResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-cyan-100 glow-cyan">
                Your results
              </h2>
              <div className="flex items-center gap-2">
                {canDownload && (
                  <button
                    type="button"
                    onClick={downloadPdf}
                    className="btn-neon rounded-md px-3 py-1.5 text-sm font-medium"
                  >
                    Download report (PDF)
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-md border border-slate-600/60 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-fuchsia-400/60 hover:text-fuchsia-200"
                >
                  Clear results
                </button>
              </div>
            </div>
            <PasswordResult slot={password} />
            <BreachResult slot={breach} email={shown.email} />
            <InfectionResult
              slot={infections}
              email={shown.email}
              username={shown.username}
            />
            <UsernameResult state={username} username={shown.username} />
          </div>
        )}

        <DomainSearch />
      </div>

      <footer className="mt-12 border-t border-cyan-500/20 pt-6 text-xs text-slate-500">
        <p>
          An awareness-training aid — not a penetration-testing or people-search
          tool. Results are ephemeral and never stored.
        </p>
        <p className="mt-2">
          Open source —{' '}
          <a
            href="https://github.com/karl-kb-tech/DataLeak"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-cyan-500/40 underline-offset-2 transition-colors hover:text-cyan-300"
          >
            view the code on GitHub
          </a>
          .
        </p>
      </footer>
    </main>
  )
}
