import { buildPrompt, type ChatMode, type PromptExtras } from './prompt'
import { streamGroq, groqModels, generateTitle, heuristicTitle, activeModel } from './groq'
import { offlineAnswer } from './offline'
import type { Section } from '../corpus/types'

export type { ChatMode, PromptExtras }

export type LlmProvider = 'groq' | 'offline'

export function llmProvider(): LlmProvider {
  return process.env.GROQ_API_KEY ? 'groq' : 'offline'
}

/** Model id shown in the UI (or "offline" when no key is configured). */
export function currentModel(): string {
  return llmProvider() === 'offline' ? 'offline' : activeModel()
}

/**
 * Streams an answer.
 *
 * Resilience chain: try each configured model in turn, and if every model is
 * unavailable (for example the Groq daily token budget is exhausted), fall back
 * to the deterministic extractive answer built from the retrieved sections.
 * The fallback quotes the acts verbatim, so citations are still verified; the
 * demo never shows a bare "generation error".
 */
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
  const messages = [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]

  for (const model of groqModels()) {
    let started = false
    try {
      for await (const delta of streamGroq(messages, maxTokens, model)) {
        started = true
        yield delta
      }
      return
    } catch (err) {
      // Once tokens have been sent we cannot switch model without duplicating text.
      if (started) throw err
      console.warn(`[llm] ${model} unavailable: ${(err as Error).message.slice(0, 160)}`)
    }
  }

  console.warn('[llm] all models unavailable, using deterministic extractive fallback')
  yield offlineAnswer(question, sections, mode)
}

export async function titleFor(question: string, answer: string): Promise<string> {
  if (llmProvider() === 'offline') return heuristicTitle(question)
  return generateTitle(question, answer)
}
