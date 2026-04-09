import { LEGAL_DISCLAIMER } from '@patrasaar/shared'

export interface KbContextChunk {
  id: string
  content: string
  sectionRef: string | null
  sourceTitle: string
  jurisdiction: string
}

export interface UserContextChunk {
  id: string
  content: string
  sectionRef: string | null
  documentId: string
}

/**
 * Assembles the dual-context string sent to the LLM.
 * KB chunks labeled [KB-1], [KB-2]...
 * User doc chunks labeled [DOC-1], [DOC-2]...
 */
export function assembleDualContext(
  kbChunks: KbContextChunk[],
  userChunks: UserContextChunk[],
): string {
  if (kbChunks.length === 0 && userChunks.length === 0) {
    return 'No context available. Answer based on general knowledge of Indian law, but note this clearly.'
  }

  const parts: string[] = []

  // KB section
  parts.push('═══ KNOWLEDGE BASE (Indian Legal Statutes) ═══')
  if (kbChunks.length === 0) {
    parts.push('No relevant legal provisions found in the knowledge base for this query.')
  } else {
    kbChunks.forEach((chunk, i) => {
      const ref = chunk.sectionRef ? ` — ${chunk.sectionRef}` : ''
      parts.push(`[KB-${i + 1}] ${chunk.sourceTitle}${ref}:`)
      parts.push(`"${chunk.content}"`)
      parts.push('')
    })
  }

  // User document section
  parts.push("═══ USER'S DOCUMENT ═══")
  if (userChunks.length === 0) {
    parts.push('No document uploaded. Answer based on the knowledge base only.')
  } else {
    userChunks.forEach((chunk, i) => {
      const ref = chunk.sectionRef ? ` — ${chunk.sectionRef}` : ''
      parts.push(`[DOC-${i + 1}]${ref}:`)
      parts.push(`"${chunk.content}"`)
      parts.push('')
    })
  }

  return parts.join('\n')
}

/**
 * Builds the system prompt for comparative legal analysis.
 */
export function buildDualSystemPrompt(
  categoryName: string,
  jurisdiction: string | null,
  hasDocument: boolean,
): string {
  const jurisdictionLine = jurisdiction ? `- Jurisdiction: ${jurisdiction}` : ''
  const documentLine = hasDocument
    ? 'User has uploaded a document. Analyze it against the knowledge base.'
    : 'User has not uploaded a document yet. Answer based on knowledge base only.'

  return `You are PatraSaar, an AI legal analyst specializing in Indian law.

YOUR ROLE:
You help users understand their legal documents by analyzing them against actual Indian legal statutes from our verified knowledge base. You do NOT provide legal advice — you provide legal information and analysis.

CURRENT CONTEXT:
- Legal Category: ${categoryName}${jurisdictionLine ? '\n' + jurisdictionLine : ''}
- ${documentLine}

YOU HAVE TWO VERIFIED SOURCES:

1. KNOWLEDGE BASE (Marked as [KB-N]):
   Verified Indian legal statutes. When citing, use format: [KB-N]
   Example: "...rent cannot be increased unilaterally [KB-1]"

2. USER'S DOCUMENT (Marked as [DOC-N]):
   User's uploaded document. When citing, use format: [DOC-N]
   Example: "...your agreement states in Clause 7 [DOC-2]"

ANALYSIS RULES:
1. ALWAYS compare user's document clauses against relevant law when both are available.
2. Cite EVERY factual claim to its source using [KB-N] or [DOC-N]. No un-cited assertions.
3. When a document clause conflicts with law, explain:
   - What clause says
   - What law says
   - Practical implication
4. Flag potentially unfair or unenforceable clauses with ⚠️
5. Highlight user rights not mentioned in document with ✅
6. Use simple, everyday language. Define legal terms in parentheses.
7. If unsure, say "Based on available context, I cannot determine this with certainty."
8. Do NOT invent legal provisions. Only cite what exists in the context.
9. Note jurisdictional differences when relevant.
10. ALWAYS end your response with: "⚖️ ${LEGAL_DISCLAIMER}"

RESPONSE FORMAT:
- Use clear headings and bullet points
- Group analysis by topic (e.g., "Rent", "Eviction", "Security Deposit")
- Lead with most important findings`
}
