'use client'

import { useState } from 'react'
import type { Remediation } from '@/lib/remediation'
import {
  passwordRemediation,
  breachRemediation,
  usernameRemediation,
  infectionRemediation,
} from '@/lib/remediation'
import { stripHtml } from '@/lib/breaches/format'
import type { Breach } from '@/lib/breaches/types'
import type {
  BreachCheck,
  InfectionCheck,
  PasswordCheck,
  UsernameDone,
  UsernameHit,
} from '@/lib/client/checks'
import type { InfectionMatch } from '@/lib/sources/hudsonrock'

export type Slot<T> =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; data: T }
  | { status: 'error' }

export interface UsernameState {
  status: 'idle' | 'running' | 'done' | 'error'
  hits: UsernameHit[]
  checked: number
  total: number
  summary?: UsernameDone
}

function Card({
  title,
  sent,
  alert,
  children,
}: {
  title: string
  sent?: string
  alert?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={`panel ${alert ? 'panel-alert' : ''} rounded-lg p-5`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3
          className={`text-base font-semibold ${
            alert ? 'text-rose-200 glow-magenta' : 'text-cyan-100 glow-cyan'
          }`}
        >
          {title}
        </h3>
        {sent && (
          <span className="text-xs text-slate-500">
            Sent: <span className="font-mono text-cyan-300">{sent}</span>
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function RemediationBlock({ r, alert }: { r: Remediation; alert: boolean }) {
  return (
    <div>
      <p className={`font-medium ${alert ? 'text-rose-300' : 'text-emerald-300'}`}>
        {r.headline}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300 marker:text-cyan-500">
        {r.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  )
}

function Pending() {
  return (
    <p className="text-sm text-cyan-400">
      <span className="animate-pulse">▮</span> Scanning…
    </p>
  )
}

function Failed({ service }: { service: string }) {
  return (
    <p className="text-sm text-amber-400">
      We couldn&apos;t check {service} right now. Please try again later.
    </p>
  )
}

export function PasswordResult({ slot }: { slot: Slot<PasswordCheck> }) {
  if (slot.status === 'idle') return null
  const alert = slot.status === 'done' && slot.data.pwned
  return (
    <Card title="Password exposure" sent="anonymous 5-character fragment" alert={alert}>
      {slot.status === 'running' && <Pending />}
      {slot.status === 'error' && <Failed service="the password database" />}
      {slot.status === 'done' && (
        <RemediationBlock
          r={passwordRemediation(slot.data.pwned, slot.data.count)}
          alert={slot.data.pwned}
        />
      )}
    </Card>
  )
}

export function BreachResult({
  slot,
  email,
}: {
  slot: Slot<BreachCheck>
  email: string
}) {
  if (slot.status === 'idle') return null
  const alert = slot.status === 'done' && slot.data.breaches.length > 0
  return (
    <Card title="Email in data breaches" sent={email} alert={alert}>
      {slot.status === 'running' && <Pending />}
      {slot.status === 'error' && <Failed service="the breach databases" />}
      {slot.status === 'done' && (
        <div className="space-y-3">
          <RemediationBlock
            r={breachRemediation(slot.data.breaches.length)}
            alert={slot.data.breaches.length > 0}
          />
          {slot.data.breaches.length > 0 && (
            <ul className="divide-y divide-cyan-500/10 overflow-hidden rounded-md border border-cyan-500/20 text-sm">
              {slot.data.breaches.map((b) => (
                <BreachRow key={b.key} breach={b} />
              ))}
            </ul>
          )}
          <SourcePanel slot={slot} />
        </div>
      )}
    </Card>
  )
}

const SOURCE_LABELS: Record<string, string> = {
  leakcheck: 'LeakCheck',
  xposedornot: 'XposedOrNot',
  hibp: 'Have I Been Pwned',
}

// A single breach, expandable for detail. "What was exposed" (data classes) and
// the description come from HIBP only; LeakCheck/XposedOrNot supply just a name
// and sometimes a date — so when the rich fields are absent we explain that in
// plain English rather than showing an empty panel.
function BreachRow({ breach }: { breach: Breach }) {
  const [open, setOpen] = useState(false)
  const label = breach.title ?? breach.name
  const reportedBy = breach.sources.map((s) => SOURCE_LABELS[s] ?? s).join(', ')

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-cyan-500/5"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-cyan-400">{open ? '−' : '+'}</span>
          <span className="truncate font-medium text-cyan-50">{label}</span>
        </span>
        {breach.date && (
          <span className="shrink-0 font-mono text-xs text-slate-500">{breach.date}</span>
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-cyan-500/10 bg-slate-950/40 px-3 py-3 text-xs leading-5 text-slate-300">
          {breach.description ? (
            <p>{stripHtml(breach.description)}</p>
          ) : (
            <p>
              Your email address appeared in data taken from{' '}
              <span className="text-cyan-200">{label}</span>. Treat any password you
              used there as compromised, and change it anywhere you reused it.
            </p>
          )}

          {breach.dataClasses && breach.dataClasses.length > 0 ? (
            <div>
              <p className="mb-1 font-semibold text-fuchsia-300">What was exposed</p>
              <ul className="flex flex-wrap gap-1.5">
                {breach.dataClasses.map((dc) => (
                  <li
                    key={dc}
                    className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[11px] text-fuchsia-200"
                  >
                    {dc}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-slate-500">
              A detailed list of exactly what was exposed isn&apos;t available from
              the free sources used here. Assume at least your email address, and
              possibly your password, were included.
            </p>
          )}

          <p className="text-slate-600">Reported by: {reportedBy}</p>
        </div>
      )}
    </li>
  )
}

function SourcePanel({ slot }: { slot: { status: 'done'; data: BreachCheck } }) {
  return (
    <div className="border-t border-cyan-500/20 pt-3 text-xs text-slate-500">
      <p className="mb-1">We checked:</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {slot.data.sources.map((s) => (
          <li key={s.source}>
            {SOURCE_LABELS[s.source] ?? s.source}:{' '}
            <span className={s.ok ? 'text-emerald-400' : 'text-amber-400'}>
              {s.ok ? 'checked' : 'unavailable'}
            </span>
          </li>
        ))}
      </ul>
      {slot.data.sources.some((s) => s.source === 'leakcheck') && (
        <p className="mt-2">
          Breach data{' '}
          <a
            href="https://leakcheck.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-100"
          >
            Powered by LeakCheck
          </a>
          .
        </p>
      )}
    </div>
  )
}

// Info-stealer malware exposure (Hudson Rock). Distinct from data breaches:
// these are credentials lifted off a malware-infected device. The masked
// passwords/logins are shown so a user can recognise their own — they arrive
// pre-masked from the source, so no cleartext is ever handled here.
export function InfectionResult({
  slot,
  email,
  username,
}: {
  slot: Slot<InfectionCheck>
  email: string
  username: string
}) {
  if (slot.status === 'idle') return null
  const sent = [email, username].filter(Boolean).join(', ')
  const infected =
    slot.status === 'done' && slot.data.matches.some((m) => m.found)
  return (
    <Card title="Info-stealer malware exposure" sent={sent} alert={infected}>
      {slot.status === 'running' && <Pending />}
      {slot.status === 'error' && <Failed service="the malware database" />}
      {slot.status === 'done' && (
        <div className="space-y-3">
          <RemediationBlock r={infectionRemediation(infected)} alert={infected} />
          {slot.data.matches.some((m) => m.found) && (
            <ul className="divide-y divide-cyan-500/10 overflow-hidden rounded-md border border-cyan-500/20 text-sm">
              {slot.data.matches
                .filter((m) => m.found)
                .map((m) => (
                  <InfectionRow key={`${m.type}:${m.target}`} match={m} />
                ))}
            </ul>
          )}
          <div className="border-t border-cyan-500/20 pt-3 text-xs text-slate-500">
            <p>
              Malware-infection data{' '}
              <a
                href="https://www.hudsonrock.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-100"
              >
                Powered by Hudson Rock
              </a>
              .
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

function MaskedList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="mb-1 font-semibold text-fuchsia-300">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <li
            key={`${v}:${i}`}
            className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 font-mono text-[11px] text-fuchsia-200"
          >
            {v}
          </li>
        ))}
      </ul>
    </div>
  )
}

function InfectionRow({ match }: { match: InfectionMatch }) {
  const [open, setOpen] = useState(false)
  const count = match.stealers.length
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-cyan-500/5"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-cyan-400">{open ? '−' : '+'}</span>
          <span className="truncate font-medium text-cyan-50">{match.target}</span>
        </span>
        <span className="shrink-0 font-mono text-xs text-slate-500">
          {count} infection{count === 1 ? '' : 's'}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-cyan-500/10 bg-slate-950/40 px-3 py-3 text-xs leading-5 text-slate-300">
          <p className="text-slate-500">
            These passwords and logins are partly hidden by the source — enough to
            recognise your own, not enough for anyone to reuse.
          </p>
          {match.stealers.map((s, i) => (
            <div key={i} className="space-y-2 border-l border-cyan-500/20 pl-3">
              {s.dateCompromised && (
                <p>
                  <span className="text-slate-500">Device infected:</span>{' '}
                  <span className="font-mono text-cyan-200">
                    {s.dateCompromised.slice(0, 10)}
                  </span>
                </p>
              )}
              {s.antiviruses && s.antiviruses.length > 0 && (
                <p>
                  <span className="text-slate-500">Security software present:</span>{' '}
                  {s.antiviruses.join(', ')}
                </p>
              )}
              {s.topPasswords && s.topPasswords.length > 0 && (
                <MaskedList title="Exposed passwords" values={s.topPasswords} />
              )}
              {s.topLogins && s.topLogins.length > 0 && (
                <MaskedList title="Exposed logins" values={s.topLogins} />
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  )
}

export function UsernameResult({
  state,
  username,
}: {
  state: UsernameState
  username: string
}) {
  if (state.status === 'idle') return null
  const pct = state.total > 0 ? Math.round((state.checked / state.total) * 100) : 0
  const alert = state.hits.length > 0
  return (
    <Card title="Username footprint" sent={username} alert={alert}>
      {state.status === 'error' && <Failed service="the username platforms" />}
      {state.status !== 'error' && (
        <div className="space-y-3">
          {state.status === 'running' && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-cyan-950/60">
                <div
                  className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Checked {state.checked} of {state.total} platforms…
              </p>
            </div>
          )}
          {(state.status === 'done' || state.hits.length > 0) && (
            <RemediationBlock
              r={usernameRemediation(state.hits.length)}
              alert={state.hits.length > 0}
            />
          )}
          {state.hits.length > 0 && (
            <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
              {state.hits.map((h) => (
                <li key={h.name}>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-100"
                  >
                    {h.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {state.status === 'done' && state.summary && (
            <p className="border-t border-cyan-500/20 pt-2 text-xs text-slate-500">
              Checked {state.summary.platformsChecked} platforms ·{' '}
              {state.summary.hits} found · {state.summary.unreachable} unreachable.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
