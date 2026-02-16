'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface Chat {
  id: string
  title: string
}

export default function NewChatPage() {
  const [input, setInput] = useState('')
  const [creating, setCreating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || creating) return
    setCreating(true)

    try {
      // Create a new chat first
      const res = await api<{ data: Chat }>('/api/chats', {
        method: 'POST',
        json: {},
      })
      // Navigate to the new chat — the message will be sent there
      router.push(`/chat/${res.data.id}?q=${encodeURIComponent(input.trim())}`)
    } catch (err) {
      console.error('Failed to create chat:', err)
      setCreating(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2rem',
        textAlign: 'center',
        gap: '1.5rem',
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-3xl)',
            marginBottom: 'var(--space-3)',
          }}
        >
          PatraSaar
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', maxWidth: 420 }}>
          Upload a legal document or ask a question to get started.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 520,
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a legal document..."
          rows={1}
          disabled={creating}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-base)',
            fontFamily: 'var(--font-body)',
            resize: 'none',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || creating}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'var(--accent-primary)',
            color: 'var(--text-inverse)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: input.trim() && !creating ? 'pointer' : 'not-allowed',
            opacity: input.trim() && !creating ? 1 : 0.5,
            transition: 'all 0.2s',
            fontSize: 'var(--text-sm)',
          }}
        >
          {creating ? '...' : 'Start'}
        </button>
      </form>
    </div>
  )
}
