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
   (IPC, BNS, BSA, BNSS, CrPC, CPC, Constitution, Contract Act, IT Act or
   Companies Act). Do NOT use the full act name or the year in the citation.
   Cite the SECTION number only - never a sub-section, so write "BNS s.318",
   not "BNS s.318(2)". All the codes listed above are usable, including the
   Constitution (cite as "Constitution s.21" for Article 21).
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

export const ABSTAIN_MESSAGE =
  "I don't have the relevant provision in my indexed corpus. I can only answer from the central acts I have indexed - the Indian Penal Code, Bharatiya Nyaya Sanhita, the Bharatiya Sakshya Adhiniyam, the Bharatiya Nagarik Suraksha Sanhita, the Code of Criminal Procedure, the Code of Civil Procedure, the Constitution of India, the Indian Contract Act, the IT Act, and the Companies Act. Try rephrasing using terms that appear in those acts, or name the section directly."

const BASELINE_RULES = `You are a helpful assistant answering questions about Indian law from your own knowledge, without any reference material.

RULES:
1. Answer the question as best you can.
2. Express every legal assertion as a citation in EXACTLY this format:
   [[ACT_CODE s.NUMBER | "verbatim quote from that provision"]]
   Use short act codes such as IPC, BNS, BSA, BNSS, CrPC, CPC, Constitution,
   Contract Act, IT Act, Companies Act. Cite the section number only.
   Put the wording you believe the provision contains inside the quotes.
3. Do not mention that you are uncertain; just answer.

This is information about statutory text, not legal advice.`

export function buildBaselinePrompt(question: string): { system: string; user: string } {
  return { system: BASELINE_RULES, user: `Question: ${question}` }
}

// The free Groq tier enforces an input-tokens-per-minute cap, so bound the
// context we send. Quotes the model produces are substrings of this truncated
// text and are still verified against the full section text server-side.
const MAX_SECTION_CHARS = 1300
const MAX_CONTEXT_CHARS = 4500

function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.lastIndexOf(' ', max)
  return (cut > max * 0.6 ? text.slice(0, cut) : text.slice(0, max)).trim()
}

export function buildPrompt(
  question: string,
  sections: Section[],
  mode: ChatMode,
  extras: PromptExtras = {},
): { system: string; user: string } {
  const blocks: string[] = []
  let used = 0
  for (const s of sections) {
    const block = `[LEGAL SECTION - ACT_CODE: ${s.act} | ${s.actFull}, Section ${s.number}: ${s.title}]\n${clip(s.text, MAX_SECTION_CHARS)}`
    if (used + block.length > MAX_CONTEXT_CHARS && blocks.length > 0) break
    blocks.push(block)
    used += block.length
  }

  const system = `${RULES}\n\nSTYLE:\n${MODE_TONE[mode]}\n\nSECTIONS:\n${blocks.join('\n---\n')}`

  const parts: string[] = []
  if (extras.selectionContext) {
    parts.push(
      `The user selected this passage from your previous answer and is cross-questioning it:\n"${extras.selectionContext}"`,
    )
  }
  if (extras.attachmentText) {
    parts.push(`[USER ATTACHMENT - not a legal source]\n${extras.attachmentText.slice(0, 20_000)}`)
  }
  parts.push(`Question: ${question}`)

  return { system, user: parts.join('\n\n') }
}
