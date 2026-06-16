'use client'

import { useRef, useState } from 'react'
import { Disclaimer } from '@/components/Disclaimer'
import { CheckForm, type CheckInput } from '@/components/CheckForm'
import {
  PasswordResult,
  BreachResult,
  UsernameResult,
  type Slot,
  type UsernameState,
} from '@/components/Results'
import {
  checkPassword,
  checkBreaches,
  runUsernameSweep,
  type PasswordCheck,
  type BreachCheck,
} from '@/lib/client/checks'

const IDLE_USERNAME: UsernameState = {
  status: 'idle',
  hits: [],
  checked: 0,
  total: 0,
}

export default function Home() {
  const [password, setPassword] = useState<Slot<PasswordCheck>>({ status: 'idle' })
  const [breach, setBreach] = useState<Slot<BreachCheck>>({ status: 'idle' })
  const [username, setUsername] = useState<UsernameState>(IDLE_USERNAME)
  // Only the values the result cards need to echo back — never the password.
  const [shown, setShown] = useState({ email: '', username: '' })
  const abortRef = useRef<AbortController | null>(null)

  const running =
    password.status === 'running' ||
    breach.status === 'running' ||
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

  const hasResults =
    password.status !== 'idle' ||
    breach.status !== 'idle' ||
    username.status !== 'idle'

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">
          Your digital footprint, in plain English
        </h1>
        <p className="mt-2 text-zinc-600">
          See what is publicly findable about you, and get simple steps to reduce
          it. Nothing you enter is stored.
        </p>
      </header>

      <div className="space-y-8">
        <Disclaimer />
        <CheckForm onSubmit={run} running={running} />

        {hasResults && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Your results</h2>
            <PasswordResult slot={password} />
            <BreachResult slot={breach} email={shown.email} />
            <UsernameResult state={username} username={shown.username} />
          </div>
        )}
      </div>

      <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500">
        An awareness-training aid — not a penetration-testing or people-search
        tool. Results are ephemeral and never stored.
      </footer>
    </main>
  )
}
