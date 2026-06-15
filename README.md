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
  tab.
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
| **Email in breaches** | LeakCheck (public) + XposedOrNot | Your email, to look up known breaches |
| **Username footprint** | Sherlock platform patterns | Your username, checked against public profile URLs |

Every external call is fanned out with `Promise.allSettled`, so one service
being down never blocks the rest. The UI shows exactly which services were
queried and what was sent to them — that transparency is the point.

> Breach results shown from LeakCheck are **Powered by LeakCheck**.

---

## Stack

- **Next.js 16** (App Router) · **TypeScript** (strict)
- **Tailwind CSS**
- **jsPDF** for client-side report export
- Deployed on **Vercel** (stateless serverless API routes)

No Python, no subprocesses — tool logic (Sherlock / theHarvester equivalents)
is reimplemented in TypeScript.

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
```

No environment variables are required for the MVP — every data source is
currently keyless.

---

## Project structure

```
app/
  api/
    password/    # HIBP k-anonymity proxy (prefix only)
    breaches/    # LeakCheck + XposedOrNot fan-out & de-dupe
    username/    # Sherlock-style username enumeration
    health/      # upstream service status
  layout.tsx
  page.tsx
lib/
  hashPassword.ts    # client-side SHA-1 prefix/suffix
  dedupeBreaches.ts  # cross-source breach-name normalisation
  sources/           # upstream source adapters
components/          # UI components
```

---

## What this tool is *not*

- Not a penetration-testing tool
- Not a bulk or automated lookup service
- Not a data broker or aggregator — results are ephemeral and never stored
- Not a replacement for professional security auditing

Use it to understand your own exposure, with consent, in an awareness-training
context.
