import type { Env } from '../../types/bindings'
import { callOpenRouter } from './client'
import { PATRASAAR_SYSTEM_PROMPT } from './prompts'

/**
 * Initiates a streaming LLM call and returns the raw ReadableStream.
 * The caller (route handler) is responsible for piping this into an SSE response.
 */
export async function streamInquiry(
  context: string,
  question: string,
  model: string,
  env: Env,
): Promise<ReadableStream> {
  const response = await callOpenRouter(
    model,
    [
      { role: 'system', content: PATRASAAR_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `[DOCUMENT CONTEXT]\n${context}\n[END CONTEXT]\n\nQuestion: ${question}`,
      },
    ],
    env,
    { stream: true },
  )

  if (!response.body) {
    throw new Error('OpenRouter returned no response body')
  }

  return response.body
}
