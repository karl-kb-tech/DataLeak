// Landing disclaimer + privacy promise. Required visible on the landing page
// (and mirrored into the PDF). Plain language, no jargon.

export function Disclaimer() {
  return (
    <section className="panel rounded-lg p-5 text-sm leading-6 text-slate-300">
      <h2 className="mb-2 text-base font-semibold text-cyan-100 glow-cyan">
        Before you start — how this works
      </h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Nothing you type is stored.</strong> There is no database and no
          logging. Results live only in this browser tab and disappear when you
          close it.
        </li>
        <li>
          <strong>Your password never leaves your device.</strong> It is scrambled
          in your browser; only a short, anonymous fragment is sent to check it.
        </li>
        <li>
          <strong>Check yourself, with consent.</strong> This is an
          awareness-training aid, not a tool for looking up other people.
        </li>
        <li>
          The only way data leaves is a PDF report <em>you</em> choose to
          download. Nothing is emailed or saved anywhere.
        </li>
      </ul>
    </section>
  )
}
