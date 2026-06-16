// Renders a ReportModel to a PDF and triggers a download — entirely in the
// browser via jsPDF. This is the tool's ONLY data-egress path, and it is
// user-initiated: nothing is generated until the user clicks download, and the
// file is created locally (never uploaded). Kept thin; the content/structure
// lives in the unit-tested buildReport.

import { jsPDF } from 'jspdf'
import type { ReportModel } from '@/lib/report'

const MARGIN = 16
const LINE = 6

/** Render a report to a jsPDF document. Pure of side effects (no file I/O). */
export function renderReport(model: ReportModel): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const maxWidth = width - MARGIN * 2
  let y = MARGIN

  function ensureSpace(needed: number) {
    if (y + needed > height - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  function write(text: string, size: number, opts: { bold?: boolean; gap?: number } = {}) {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, maxWidth) as string[]
    for (const line of lines) {
      ensureSpace(LINE)
      doc.text(line, MARGIN, y)
      y += LINE
    }
    if (opts.gap) y += opts.gap
  }

  write(model.title, 18, { bold: true, gap: 1 })
  write(`Generated ${model.generatedAt}`, 9, { gap: 3 })
  write(model.intro, 10, { gap: 4 })

  for (const section of model.sections) {
    ensureSpace(LINE * 3)
    write(section.title, 13, { bold: true })
    if (section.sent) write(`Sent: ${section.sent}`, 8, { gap: 1 })
    write(section.remediation.headline, 10, { bold: true, gap: 1 })
    for (const step of section.remediation.steps) write(`•  ${step}`, 10)
    if (section.findings.length > 0) {
      y += 1
      write('Found:', 9, { bold: true })
      for (const f of section.findings) write(`–  ${f}`, 9)
    }
    y += 4
  }

  for (const attribution of model.attributions) write(attribution, 8, { gap: 1 })

  y += 2
  write(model.disclaimer, 8, { gap: 0 })

  return doc
}

/** Render the report and trigger a browser download. The only data-egress path. */
export function downloadReport(model: ReportModel): void {
  renderReport(model).save('digital-footprint-report.pdf')
}
