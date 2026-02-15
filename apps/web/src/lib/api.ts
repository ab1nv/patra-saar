const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

interface FetchOptions extends RequestInit {
  json?: unknown
}

// Typed fetch wrapper for the Hono API
export async function api<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { json, headers: customHeaders, ...rest } = options

  const headers: HeadersInit = {
    ...(customHeaders || {}),
  }

  if (json) {
    ;(headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    credentials: 'include', // send cookies for BetterAuth sessions
    body: json ? JSON.stringify(json) : rest.body,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new Error((errorBody as any).error?.message || `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

// SSE reader for streaming LLM responses
export function createSSEReader(
  url: string,
  body: FormData | string,
  onToken: (content: string) => void,
  onDone: (messageId: string) => void,
  onError: (error: string) => void,
  onProgress?: (status: string, progress: number) => void,
) {
  const isFormData = body instanceof FormData

  fetch(`${API_BASE}${url}`, {
    method: 'POST',
    credentials: 'include',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? body : body,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: 'Stream failed' } }))
        onError((err as any).error?.message || 'Stream failed')
        return
      }

      // Check if it is a JSON response (non-streaming, e.g. file upload accepted)
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await response.json()
        onDone((data as any).data?.userMessageId || '')
        return
      }

      // SSE stream
      const reader = response.body?.getReader()
      if (!reader) {
        onError('No response body')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'token') {
              onToken(parsed.content)
            } else if (parsed.type === 'done') {
              onDone(parsed.messageId)
            } else if (parsed.type === 'error') {
              onError(parsed.message)
            } else if (parsed.type === 'progress' && onProgress) {
              onProgress(parsed.status, parsed.progress)
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    })
    .catch((err) => {
      onError(err.message || 'Network error')
    })
}
