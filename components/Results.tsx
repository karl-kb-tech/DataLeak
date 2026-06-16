'use client'

import type { Remediation } from '@/lib/remediation'
import {
  passwordRemediation,
  breachRemediation,
  usernameRemediation,
} from '@/lib/remediation'
import type {
  BreachCheck,
  PasswordCheck,
  UsernameDone,
  UsernameHit,
} from '@/lib/client/checks'

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
  children,
}: {
  title: string
  sent?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-zinc-200 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        {sent && (
          <span className="text-xs text-zinc-500">
            Sent: <span className="font-mono">{sent}</span>
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
      <p
        className={`font-medium ${alert ? 'text-red-700' : 'text-green-700'}`}
      >
        {r.headline}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
        {r.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  )
}

function Pending() {
  return <p className="text-sm text-zinc-500">Checking…</p>
}

function Failed({ service }: { service: string }) {
  return (
    <p className="text-sm text-amber-700">
      We couldn&apos;t check {service} right now. Please try again later.
    </p>
  )
}

export function PasswordResult({ slot }: { slot: Slot<PasswordCheck> }) {
  if (slot.status === 'idle') return null
  return (
    <Card title="Password exposure" sent="anonymous 5-character fragment">
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
  return (
    <Card title="Email in data breaches" sent={email}>
      {slot.status === 'running' && <Pending />}
      {slot.status === 'error' && <Failed service="the breach databases" />}
      {slot.status === 'done' && (
        <div className="space-y-3">
          <RemediationBlock
            r={breachRemediation(slot.data.breaches.length)}
            alert={slot.data.breaches.length > 0}
          />
          {slot.data.breaches.length > 0 && (
            <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-100 text-sm">
              {slot.data.breaches.map((b) => (
                <li key={b.key} className="flex justify-between gap-3 px-3 py-2">
                  <span className="font-medium text-zinc-800">{b.title ?? b.name}</span>
                  {b.date && <span className="text-zinc-500">{b.date}</span>}
                </li>
              ))}
            </ul>
          )}
          <SourcePanel slot={slot} />
        </div>
      )}
    </Card>
  )
}

function SourcePanel({ slot }: { slot: { status: 'done'; data: BreachCheck } }) {
  return (
    <div className="border-t border-zinc-100 pt-3 text-xs text-zinc-500">
      <p className="mb-1">We checked:</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {slot.data.sources.map((s) => (
          <li key={s.source}>
            {SOURCE_LABELS[s.source] ?? s.source}: {s.ok ? 'checked' : 'unavailable'}
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
            className="underline"
          >
            Powered by LeakCheck
          </a>
          .
        </p>
      )}
    </div>
  )
}

const SOURCE_LABELS: Record<string, string> = {
  leakcheck: 'LeakCheck',
  xposedornot: 'XposedOrNot',
  hibp: 'Have I Been Pwned',
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
  return (
    <Card title="Username footprint" sent={username}>
      {state.status === 'error' && <Failed service="the username platforms" />}
      {state.status !== 'error' && (
        <div className="space-y-3">
          {state.status === 'running' && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full bg-zinc-700 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
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
                    className="text-zinc-700 underline"
                  >
                    {h.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {state.status === 'done' && state.summary && (
            <p className="border-t border-zinc-100 pt-2 text-xs text-zinc-500">
              Checked {state.summary.platformsChecked} platforms ·{' '}
              {state.summary.hits} found · {state.summary.unreachable} unreachable.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
