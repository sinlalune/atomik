/**
 * HTML comments are INVISIBLE (CP-MVP-011 S07j).
 *
 * The app writes its per-turn bookkeeping onto chat headings —
 * `## you <!-- sent: … -->`, `## atomik <!-- run: … --> <!-- trace:[[…]] -->`.
 * That idiom was chosen because a comment renders as nothing in Markdown. It
 * does not here: `noteMarkdown()` runs with `html: false`, which ESCAPES html
 * rather than dropping it, so every transcript opened as a note displayed its
 * own machinery as prose. The owner's bench screenshot showed a heading
 * reading `you <!-- sent: system=2646|history=34:history · 1 turn … -->`.
 *
 * `html: true` would fix the symptom and open the door this app keeps shut:
 * model output is rendered here, and raw html from a model is exactly what 13
 * forbids. So the comments are removed from the SOURCE before parsing, and
 * `html` stays false.
 *
 * Fences and inline code are preserved: a note explaining html comments must
 * still be able to show one. That is the same rule `parseEdges` follows, for
 * the same reason.
 */

const FENCE_RE = /^\s*(```|~~~)/

/** Strips `<!-- … -->` outside fenced blocks and inline code spans. */
export function stripHtmlComments(markdown: string): string {
  const lines = markdown.split('\n')
  const out: string[] = []
  let inFence = false
  // A comment may span lines; once open, everything up to `-->` is dropped
  // — including fence markers, because a fence opened inside a comment is
  // not a fence.
  let inComment = false
  for (const line of lines) {
    if (!inComment && FENCE_RE.test(line)) {
      inFence = !inFence
      out.push(line)
      continue
    }
    if (inFence) {
      out.push(line)
      continue
    }
    let result = ''
    let index = 0
    let inCode = false
    while (index < line.length) {
      if (inComment) {
        const end = line.indexOf('-->', index)
        if (end === -1) {
          index = line.length
          break
        }
        inComment = false
        index = end + 3
        continue
      }
      const char = line[index]!
      if (char === '`') {
        inCode = !inCode
        result += char
        index += 1
        continue
      }
      if (!inCode && line.startsWith('<!--', index)) {
        inComment = true
        index += 4
        continue
      }
      result += char
      index += 1
    }
    // A line that was nothing but a comment leaves no blank line behind: an
    // empty heading line would end a paragraph that was never broken.
    if (result.trim().length > 0 || line.trim().length === 0) out.push(result)
  }
  return out.join('\n')
}
