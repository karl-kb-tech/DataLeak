'use client'

import { useState } from 'react'
import type { UsernameScope } from '@/lib/client/checks'

export interface CheckInput {
  email: string
  username: string
  password: string
  scope: UsernameScope
}

interface Props {
  onSubmit: (input: CheckInput) => void
  running: boolean
}

// Single form for all three checks. Each field is optional; the user runs only
// the checks they fill in. The password field is type=password and its value is
// never echoed back into the DOM beyond the input itself.
export function CheckForm({ onSubmit, running }: Props) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [scope, setScope] = useState<UsernameScope>('curated')

  const nothingEntered = !email.trim() && !username.trim() && !password

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (running || nothingEntered) return
    onSubmit({ email: email.trim(), username: username.trim(), password, scope })
    // Drop the raw password from state/DOM as soon as it's handed off (the hash
    // happens inside onSubmit, on the value captured above). Minimises how long
    // the plaintext lives in memory — it's never needed again after submission.
    setPassword('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field
        id="email"
        label="Email address"
        hint="Checked against known data breaches."
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
      />

      <div className="space-y-2">
        <Field
          id="username"
          label="Username or handle"
          hint="Checked for public profiles across popular platforms."
          type="text"
          autoComplete="off"
          placeholder="e.g. janedoe"
          value={username}
          onChange={setUsername}
        />
        <fieldset className="flex flex-wrap gap-4 pl-1 text-sm text-slate-400">
          <legend className="sr-only">How many platforms to check</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              checked={scope === 'curated'}
              onChange={() => setScope('curated')}
              className="accent-cyan-400"
            />
            Popular platforms (faster)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
              className="accent-cyan-400"
            />
            Check everything (slower, noisier)
          </label>
        </fieldset>
      </div>

      <Field
        id="password"
        label="Password"
        hint="Scrambled in your browser — only an anonymous fragment is sent."
        type="password"
        autoComplete="off"
        placeholder="A password you want to check"
        value={password}
        onChange={setPassword}
      />

      <button
        type="submit"
        disabled={running || nothingEntered}
        // Password managers / form-filling extensions commonly mutate this
        // submit button (and the adjacent password field) before React
        // hydrates, which trips a benign hydration warning. The app renders
        // identically server/client in a clean browser; scope the suppression
        // to just this node so real mismatches elsewhere still surface.
        suppressHydrationWarning
        className="btn-neon w-full rounded-md px-4 py-2.5 font-medium"
      >
        {running ? 'Scanning…' : 'Check my exposure'}
      </button>
      {nothingEntered && (
        <p className="text-center text-sm text-slate-500">
          Fill in at least one field above to begin.
        </p>
      )}
    </form>
  )
}

interface FieldProps {
  id: string
  label: string
  hint: string
  type: string
  autoComplete: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

function Field({ id, label, hint, type, autoComplete, placeholder, value, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-cyan-100">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-cyan-500/30 bg-slate-950/60 px-3 py-2 text-cyan-50 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/60"
      />
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  )
}
