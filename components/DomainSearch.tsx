'use client'

import { useState } from 'react'
import { normaliseDomain, buildDorks, type DorkCategory } from '@/lib/dorks'

// Generates click-to-run Google searches that reveal an organisation's public
// footprint. Pure client-side link building — we never query Google ourselves,
// nothing is sent or stored. Intended for domains you are authorised to assess.

export function DomainSearch() {
  const [input, setInput] = useState('')
  const [categories, setCategories] = useState<DorkCategory[] | null>(null)
  const [domain, setDomain] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalised = normaliseDomain(input)
    if (!normalised) {
      setError(true)
      setCategories(null)
      return
    }
    setError(false)
    setDomain(normalised)
    setCategories(buildDorks(normalised))
  }

  return (
    <section className="panel rounded-lg p-5">
      <h3 className="text-base font-semibold text-cyan-100 glow-cyan">
        Organisation footprint (Google dorks)
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        See what an attacker can find about an organisation with nothing but a
        search engine. Enter a domain you are{' '}
        <strong>authorised to assess</strong> (e.g. your own workplace). These
        open Google searches in a new tab — nothing is sent or stored.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          placeholder="yourcompany.co.nz"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Organisation domain"
          className="min-w-0 flex-1 rounded-md border border-cyan-500/30 bg-slate-950/60 px-3 py-2 font-mono text-cyan-50 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/60"
        />
        <button
          type="submit"
          className="btn-neon rounded-md px-4 py-2 font-medium"
        >
          Build searches
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-amber-400">
          That doesn&apos;t look like a domain. Try something like{' '}
          <span className="font-mono text-cyan-300">yourcompany.co.nz</span>.
        </p>
      )}

      {categories && (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-slate-400">
            Searches for{' '}
            <span className="font-mono font-medium text-cyan-300">{domain}</span>:
          </p>
          {categories.map((cat) => (
            <div key={cat.title}>
              <h4 className="text-sm font-semibold text-fuchsia-300 glow-magenta">
                {cat.title}
              </h4>
              <ul className="mt-1 space-y-2">
                {cat.links.map((l) => (
                  <li key={l.query} className="text-sm">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 transition-colors hover:text-cyan-100"
                    >
                      {l.label}
                    </a>
                    <p className="text-slate-400">{l.why}</p>
                    <code className="text-xs text-slate-600">{l.query}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
