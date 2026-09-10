import type { Section } from '../corpus/types'

export type ChatMode = 'lawyer' | 'client'

export type PromptExtras = {
  attachmentText?: string
  selectionContext?: string
}

const RULES = `You are PatraSaar. You answer questions about Indian law using ONLY the statutory sections provided below. You have no other legal knowledge.

RULES:
1. If the provided sections do not answer the question, say exactly: "I don't have the relevant provision in my indexed corpus." Do not answer from memory. Do not guess.
2. Every legal assertion MUST carry a citation in EXACTLY this format:
   [[ACT_CODE s.NUMBER | "verbatim quote from that section"]]
   ACT_CODE is the short code shown at the start of each section header below
   (IPC, BNS, Contract Act, IT Act, Companies Act or BSA). Do NOT use the full
   act name or the year in the citation. Cite the SECTION number only — never a
   sub-section, so write "BNS s.318", not "BNS s.318(2)".
   The quote MUST be copied character-for-character from the section text below.
   Do not paraphrase inside the quotes. Do not change punctuation or wording.
3. Cite ONLY sections that appear below. Never cite a section that is not provided.
4. Prefer to quote the operative words of the section. Keep each quote to one or two sentences.
5. Do not invent or reference case law, rules, notifications, or state amendments.
6. When the user attaches a document, you may use it to understand the question, but it is NOT a
   legal source: never emit a citation token for the attachment. Cite only the sections below.
7. This is information about statutory text, not legal advice.`

const MODE_TONE: Record<ChatMode, string> = {
  lawyer:
    'Write for a legal professional: precise, concise, and organized. You may use technical terms.',
  client:
    'Write for a lay reader: plain language, short sentences, explain any technical term in parentheses.',
}

export function buildPrompt(
  question: string,
  sections: Section[],
  mode: ChatMode,
  extras: PromptExtras = {},
): { system: string; user: string } {
  const block = sections
    .map(
      (s) =>
        `[LEGAL SECTION — ACT_CODE: ${s.act} | ${s.actFull}, Section ${s.number}: ${s.title}]\n${s.text}`,
    )
    .join('\n---\n')

  const system = `${RULES}\n\nSTYLE:\n${MODE_TONE[mode]}\n\nSECTIONS:\n${block}`

  const parts: string[] = []
  if (extras.selectionContext) {
    parts.push(
      `The user selected this passage from your previous answer and is cross-questioning it:\n"${extras.selectionContext}"`,
    )
  }
  if (extras.attachmentText) {
    parts.push(`[USER ATTACHMENT — not a legal source]\n${extras.attachmentText.slice(0, 20_000)}`)
  }
  parts.push(`Question: ${question}`)

  return { system, user: parts.join('\n\n') }
}
