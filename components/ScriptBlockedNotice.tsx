'use client'

import { useSyncExternalStore } from 'react'

// Never resubscribes — we only need the server-vs-client snapshot difference.
const noopSubscribe = () => () => {}

// Graceful fallback for when JavaScript never runs — either disabled outright or
// (more commonly) a script/ad blocker like uBlock in hard mode blocking our
// first-party scripts. The whole tool is client-side React, so blocked scripts
// otherwise leave a silently dead page. This notice is server-rendered and only
// removed once React hydrates: if scripts are blocked, hydration never happens
// and the notice stays. The `.js-fallback` class in globals.css fades it in
// after a short delay, so a working browser removes it long before it's ever
// visible — no flash on normal loads.
export function ScriptBlockedNotice() {
  // false on the server and during the initial hydration render; true once React
  // is running on the client. If scripts are blocked, this never flips to true.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
  if (hydrated) return null

  return (
    <div
      role="alert"
      className="js-fallback fixed bottom-4 right-4 z-50 max-w-xs rounded-md border border-amber-500/40 bg-slate-950/90 px-4 py-3 text-sm shadow-lg backdrop-blur"
    >
      <p className="font-semibold text-amber-300">JavaScript appears to be blocked</p>
      <p className="mt-1 leading-5 text-slate-300">
        This tool runs entirely in your browser and needs JavaScript. If you use an
        ad or script blocker (e.g. uBlock), please allow scripts for this site and
        reload the page.
      </p>
    </div>
  )
}
