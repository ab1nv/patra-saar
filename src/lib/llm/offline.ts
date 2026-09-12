import type { Section } from '../corpus/types'
import type { ChatMode } from './prompt'

/**
 * Deterministic, dependency-free answer used when GROQ_API_KEY is absent.
 * It quotes verbatim from retrieved sections and emits the same citation
 * grammar as the model, so the verification layer behaves identically.
 * This is a demo/offline fallback, not a substitute for the LLM.
 */
export function offlineAnswer(question: string, sections: Section[], mode: ChatMode): string {
  if (sections.length === 0) {
    return "I don't have the relevant provision in my indexed corpus."
  }

  const intro =
    mode === 'lawyer'
      ? `The indexed statutory text relevant to "${question}" is set out below.`
      : `Here is what the bare acts I have indexed say about "${question}".`

  const parts: string[] = [intro]

  for (const s of sections.slice(0, 3)) {
    const quote = firstSentence(s.text)
    parts.push(
      `\n**${s.actFull}, Section ${s.number} - ${s.title}**\n\n` +
        `The provision reads: "${quote}" ` +
        `[[${s.act} s.${s.number} | "${quote}"]]`,
    )
  }

  parts.push(
    '\nThis is information about statutory text, not legal advice. Verify against the official bare act before relying on it.',
  )

  return parts.join('\n')
}

/** Returns a verbatim substring of the section text (safe for quote verification). */
function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= 200) return cleaned
  const window = cleaned.slice(0, 240)
  const end = window.search(/\.\s/)
  if (end > 20) return window.slice(0, end + 1).trim()
  const cut = window.lastIndexOf(' ', 200)
  return cut > 20 ? window.slice(0, cut).trim() : window.slice(0, 200).trim()
}
