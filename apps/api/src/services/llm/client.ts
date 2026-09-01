import type { Env } from '../../types/bindings'

/**
 * Thin wrapper around the OpenRouter API.
 * All LLM calls go through here so we have a single place to
 * handle auth, retries, and error formatting.
 */
export async function callOpenRouter(
  model: string,
  messages: { role: string; content: string }[],
  env: Env,
  options: { stream?: boolean } = {},
): Promise<Response> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'PatraSaar Intelligence',
    },
    body: JSON.stringify({
      model,
      stream: options.stream ?? false,
      messages,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenRouter ${response.status}: ${body}`)
  }

  return response
}
