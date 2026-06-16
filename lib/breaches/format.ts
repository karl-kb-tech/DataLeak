// Presentation helpers for breach detail. Kept pure + tested so the React
// component stays thin.

// HIBP breach descriptions arrive as a snippet of HTML (they embed <a> links
// and HTML entities). We never inject that markup into the DOM — instead we
// flatten it to plain text, which React then renders (and re-escapes) safely.
// This is both an XSS guard and a readability fix.
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // drop tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
