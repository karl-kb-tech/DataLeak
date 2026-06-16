# DataLeak — NZ Privacy Awareness Tool

A consumer-facing **digital footprint awareness tool** for New Zealand users,
built primarily for corporate security-awareness training. You enter a few
details, the tool surfaces what is publicly findable about you, and it hands
back plain-English steps to reduce your exposure.

It is a teaching aid, not a surveillance product. **Nothing you enter is ever
stored.**

---

## Privacy by design

Ephemerality is the core architectural constraint, enforced at every layer:

- **No database, no logging, no server-side persistence.** Search terms,
  emails, usernames and results are never written down anywhere.
- **Results live only in your browser's memory** and vanish when you close the
  tab — or sooner, via the **Clear results** button, which wipes every result
  and the inputs echoed back on screen on demand (handy on shared machines).
- **Nothing is cached to disk.** Check requests and responses are sent with
  `no-store` on both the client fetch and the API response, so the browser's
  HTTP cache never retains them.
- **Passwords never leave your device.** They are hashed in-browser with the
  Web Crypto API; only a 5-character hash prefix is sent upstream
  ([k-anonymity](https://en.wikipedia.org/wiki/K-anonymity)).
- **The only way data leaves is a PDF you download yourself.** Nothing is
  emailed or saved server-side.

---

## What it checks

| Check | Source | What is sent |
|---|---|---|
| **Password exposure** | HIBP Pwned Passwords | A 5-char SHA-1 prefix only — never the password |
| **Email in breaches** | LeakCheck (public) + XposedOrNot, plus HIBP when an API key is configured | Your email, to look up known breaches |
| **Username footprint** | Sherlock platform patterns | Your username, checked against public profile URLs |

Every external call is fanned out with `Promise.allSettled`, so one service
being down never blocks the rest. The UI shows exactly which services were
queried and what was sent to them — that transparency is the point.

> Breach results shown from LeakCheck are **Powered by LeakCheck**.

**Breach detail.** Each breach can be expanded for plain-English detail. When
HIBP is configured, expanded rows show the breach description and exactly which
data classes were exposed; with the keyless sources alone (which return only a
name and sometimes a date), the row explains in plain English what to assume
instead of showing an empty panel.

**Username scope & streaming.** The username check defaults to a curated
high-signal subset (~46 platforms) for fast, low-noise results; "Check
everything" is an explicit opt-in that sweeps the full Sherlock set (~481
platforms). Results stream over Server-Sent Events, so hits and progress render
as they arrive rather than after one long blocking call.

---

## Beyond the personal checks

The tool also includes awareness-training material aimed at the *organisation's*
footprint, not just the individual's:

- **"What is OSINT?" primer** — an inline explainer of how an organisation's
  public footprint is built up unintentionally (reused passwords, staff
  profiles, published files, reused usernames) and how attackers use it.
- **Organisation domain footprint** — enter a domain you are authorised to
  assess and the tool builds categorised Google "dork" search links (exposed
  documents, open directories, login portals, staff/email exposure, code &
  paste leaks, cloud storage). This is **100% client-side URL construction** —
  the tool never queries Google itself (that would be scraping) and stores
  nothing; it hands you ready-to-click links. Framed for authorised,
  consent-based assessment of your own org, not bulk recon.

---

## Report export

The only way data leaves the browser is a **PDF report you generate yourself**.
Export is entirely client-side (jsPDF, lazy-loaded) and user-initiated — nothing
is emailed or saved server-side. This is the single deliberate egress path in
the ephemerality model.

---

## Look & feel

A committed dark "Tron / cyberpunk" theme: a deep blue-black base, a flat neon
grid behind all content, cyan as the primary accent and magenta as the
secondary. It is not tied to `prefers-color-scheme` — the app is dark by design.

---

## Stack

- **Next.js 16** (App Router) · **TypeScript** (strict)
- **Tailwind CSS**
- **jsPDF** for client-side report export
- **Vitest** for unit tests
- Deployed on **Vercel** (stateless serverless API routes)

No Python, no subprocesses — tool logic (Sherlock / theHarvester equivalents)
is reimplemented in TypeScript.

API routes are protected by per-route, in-memory rate limiting and strict
input validation, and the app ships a Content-Security-Policy and hardened
security headers. None of this involves persistence or logging — the
ephemerality constraint holds throughout.

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run lint    # lint
npm test        # run the unit tests (Vitest)
```

No environment variables are required for the MVP — every data source is
keyless by default. Setting an optional `HIBP_API_KEY` (see `.env.example`)
additionally queries the Have I Been Pwned breach API for richer email
results; without it, the email check falls back to LeakCheck + XposedOrNot.

---

## Project structure

```
app/
  api/
    password/    # HIBP k-anonymity proxy (prefix only)
    breaches/    # LeakCheck + XposedOrNot fan-out & de-dupe
    username/    # Sherlock-style enumeration, streamed over SSE
    health/      # upstream service status
  globals.css   # Tron/cyberpunk theme (committed dark)
  layout.tsx
  page.tsx
lib/
  hashPassword.ts    # client-side SHA-1 prefix/suffix
  dedupeBreaches.ts  # cross-source breach-name normalisation
  validation.ts      # server-side input validation/normalisation
  rateLimit.ts       # in-memory, ephemeral per-route rate limiting
  concurrency.ts     # bounded-concurrency fan-out helper
  dorks.ts           # org-domain Google-dork link builder (client-side)
  remediation.ts     # plain-English next steps per finding
  report.ts          # builds the report model from results
  client/            # browser-side check orchestration + SSE consumer
  breaches/          # breach types + HTML-stripping for descriptions
  pdf/               # client-side PDF generation (jsPDF)
  sources/           # upstream breach source adapters (hibp, leakcheck, xposedornot)
  sherlock/          # username enumeration (loader, classify, check, curated subset)
components/          # UI components (CheckForm, Results, OsintIntro, DomainSearch, Disclaimer)
```

---

## What this tool is *not*

- Not a penetration-testing tool
- Not a bulk or automated lookup service
- Not a data broker or aggregator — results are ephemeral and never stored
- Not a replacement for professional security auditing

Use it to understand your own exposure, with consent, in an awareness-training
context.
