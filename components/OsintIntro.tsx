'use client'

import { useState } from 'react'

// Self-contained "What is OSINT?" primer. No external links — this tool is
// embedded as a custom module in KnowBe4, so all teaching content lives inline.

export function OsintIntro() {
  const [open, setOpen] = useState(false)
  return (
    <section className="rounded-lg border border-zinc-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-zinc-900">
          What is OSINT — and how does your organisation feed it?
        </span>
        <span className="text-zinc-400">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-zinc-100 px-5 py-4 text-sm leading-6 text-zinc-700">
          <p>
            <strong>OSINT</strong> (Open-Source Intelligence) is information
            anyone can find using public sources — search engines, social media,
            company websites, leaked data — with no hacking required. Attackers
            use it to research a target before they strike.
          </p>
          <p>
            Most of an organisation&apos;s OSINT footprint is created
            unintentionally, by ordinary activity:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Reused passwords and work emails</strong> turn up in data
              breaches, giving attackers a way in.
            </li>
            <li>
              <strong>Staff profiles</strong> reveal names, roles and reporting
              lines — the raw material for convincing phishing.
            </li>
            <li>
              <strong>Published files and misconfigured pages</strong> expose
              documents, logins and sometimes credentials.
            </li>
            <li>
              <strong>Reused usernames</strong> quietly link someone&apos;s
              personal and work identities together.
            </li>
          </ul>
          <p>
            The checks below let you see your own footprint the way an attacker
            would — and each result comes with simple steps to shrink it.
          </p>
        </div>
      )}
    </section>
  )
}
