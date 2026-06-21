'use client'

import { useState } from 'react'
import { normaliseDomain, buildDorks, type DorkCategory } from '@/lib/dorks'
import { checkDomainIntel } from '@/lib/client/checks'
import type { DomainIntel } from '@/lib/sources/hudsonrock'
import type { Slot } from '@/components/Results'

// Generates click-to-run Google searches that reveal an organisation's public
// footprint. Pure client-side link building — we never query Google ourselves,
// nothing is sent or stored. Intended for domains you are authorised to assess.
//
// The "also check breach & malware data" checkbox is the one part that leaves
// the browser: when ticked, the same submit sends the domain to Hudson Rock to
// look up info-stealer infections. It is off by default and clearly labelled so
// the dork-building path stays 100% client-side unless the user opts in.

export function DomainSearch() {
  const [input, setInput] = useState('')
  const [categories, setCategories] = useState<DorkCategory[] | null>(null)
  const [domain, setDomain] = useState('')
  const [error, setError] = useState(false)
  const [includeIntel, setIncludeIntel] = useState(false)
  const [intel, setIntel] = useState<Slot<DomainIntel>>({ status: 'idle' })

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

    // The opt-in server call rides along with the same submit. When unticked,
    // clear any earlier result so it doesn't linger against a new domain.
    if (!includeIntel) {
      setIntel({ status: 'idle' })
      return
    }
    setIntel({ status: 'running' })
    checkDomainIntel(normalised)
      .then((res) =>
        setIntel(
          res.intel
            ? { status: 'done', data: res.intel }
            : { status: 'error' },
        ),
      )
      .catch(() => setIntel({ status: 'error' }))
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

      <div className="mt-3">
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={includeIntel}
            onChange={(e) => setIncludeIntel(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-fuchsia-500"
          />
          <span>
            Also check breach &amp; malware data
            <span className="mt-0.5 block text-xs text-slate-500">
              Unlike the searches above, this sends the domain to Hudson Rock (a
              breach-intelligence service) to look up info-stealer infections
              tied to it. Nothing is stored.
            </span>
          </span>
        </label>
      </div>

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

      {intel.status === 'running' && (
        <p className="mt-4 text-sm text-slate-400">
          Checking breach &amp; malware data for{' '}
          <span className="font-mono text-cyan-300">{domain}</span>…
        </p>
      )}

      {intel.status === 'error' && (
        <p className="mt-4 text-sm text-amber-400">
          We couldn&apos;t reach Hudson Rock just now. Try again in a moment.
        </p>
      )}

      {intel.status === 'done' && <DomainIntelView intel={intel.data} />}
    </section>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md border border-cyan-500/20 bg-slate-950/40 px-3 py-2">
      <p className="text-xl font-bold text-cyan-100">
        {value.toLocaleString('en-NZ')}
      </p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

function DomainIntelView({ intel }: { intel: DomainIntel }) {
  if (!intel.found) {
    return (
      <div className="mt-5 panel rounded-lg p-4">
        <p className="text-sm text-slate-300">
          No info-stealer infections were found for{' '}
          <span className="font-mono text-cyan-300">{intel.domain}</span> in
          Hudson Rock&apos;s dataset. This only covers infections that have been
          collected — treat it as encouraging, not a clean bill of health.
        </p>
        <HudsonRockAttribution />
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-4 panel rounded-lg p-4">
      <p className="text-sm text-slate-300">
        Info-stealer footprint for{' '}
        <span className="font-mono text-cyan-300">{intel.domain}</span> — these
        are devices infected with password-stealing malware that had a login for
        this domain saved.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={intel.total} label="infected machines" />
        <Stat value={intel.employees} label="staff logins" />
        <Stat value={intel.users} label="customer logins" />
        <Stat value={intel.thirdParties} label="third-party logins" />
      </div>

      {intel.stealerFamilies.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-fuchsia-300 glow-magenta">
            Malware families seen
          </h4>
          <ul className="mt-1 flex flex-wrap gap-2">
            {intel.stealerFamilies.map((f) => (
              <li
                key={f.name}
                className="rounded-full border border-fuchsia-500/30 px-2.5 py-0.5 text-xs text-slate-300"
              >
                {f.name}{' '}
                <span className="text-slate-500">
                  ({f.count.toLocaleString('en-NZ')})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {intel.clientUrls.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-fuchsia-300 glow-magenta">
            Login pages seen in the logs
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Pages where stolen credentials for this domain were captured.
          </p>
          <ul className="mt-1 space-y-1">
            {intel.clientUrls.slice(0, 10).map((u) => (
              <li key={u.url} className="text-sm text-slate-300">
                <code className="text-xs text-cyan-300">{u.url}</code>{' '}
                <span className="text-slate-500">×{u.occurrence}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <HudsonRockAttribution />
    </div>
  )
}

function HudsonRockAttribution() {
  return (
    <p className="mt-3 text-xs text-slate-600">
      Powered by{' '}
      <a
        href="https://www.hudsonrock.com"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-slate-600 underline-offset-2 hover:text-slate-400"
      >
        Hudson Rock
      </a>
      .
    </p>
  )
}
