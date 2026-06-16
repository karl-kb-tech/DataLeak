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
        <fieldset className="flex flex-wrap gap-4 pl-1 text-sm text-zinc-600">
          <legend className="sr-only">How many platforms to check</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              checked={scope === 'curated'}
              onChange={() => setScope('curated')}
            />
            Popular platforms (faster)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
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
        className="w-full rounded-md bg-zinc-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {running ? 'Checking…' : 'Check my exposure'}
      </button>
      {nothingEntered && (
        <p className="text-center text-sm text-zinc-500">
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
      <label htmlFor={id} className="block text-sm font-medium text-zinc-900">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      />
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  )
}
