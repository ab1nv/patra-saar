import { buildPrompt, type ChatMode, type PromptExtras } from './prompt'
import { streamGroq, generateTitle, heuristicTitle } from './groq'
import { offlineAnswer } from './offline'
import type { Section } from '../corpus/types'

export type { ChatMode, PromptExtras }

export type LlmProvider = 'groq' | 'offline'

export function llmProvider(): LlmProvider {
  return process.env.GROQ_API_KEY ? 'groq' : 'offline'
}

/** Streams an answer. Uses Groq when configured, otherwise a deterministic offline fallback. */
export async function* streamAnswer(
  question: string,
  sections: Section[],
  mode: ChatMode,
  extras: PromptExtras = {},
  maxTokens?: number,
): AsyncGenerator<string> {
  if (llmProvider() === 'offline') {
    yield offlineAnswer(question, sections, mode)
    return
  }
  const { system, user } = buildPrompt(question, sections, mode, extras)
  yield* streamGroq(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    maxTokens,
  )
}

export async function titleFor(question: string, answer: string): Promise<string> {
  if (llmProvider() === 'offline') return heuristicTitle(question)
  return generateTitle(question, answer)
}
