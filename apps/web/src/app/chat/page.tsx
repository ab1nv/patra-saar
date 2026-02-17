'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import styles from './chat-layout.module.css'

interface Chat {
  id: string
  title: string
}

export default function NewChatPage() {
  const [input, setInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if ((!input.trim() && !selectedFile) || creating) return
    setCreating(true)
    setSubmitted(true)

    try {
      const res = await api<{ data: Chat }>('/api/chats', {
        method: 'POST',
        json: {},
      })
      // Wait for animation to finish, then navigate seamlessly
      setTimeout(() => {
        router.push(`/chat/${res.data.id}?q=${encodeURIComponent(input.trim())}`)
      }, 550)
    } catch (err) {
      console.error('Failed to create chat:', err)
      setCreating(false)
      setSubmitted(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className={styles.newChatPage}>
      {/* Single centered container that slides down on submit */}
      <div className={`${styles.centerStage} ${submitted ? styles.centerStageBottom : ''}`}>
        <h1 className={`${styles.greeting} ${submitted ? styles.greetingHidden : ''}`}>
          Legal assistance, simplified.
        </h1>

        <div className={styles.inputBarWrap}>
          {selectedFile && (
            <div className={styles.filePreviewNew}>
              <span className={styles.fileName}>📎 {selectedFile.name}</span>
              <button
                type="button"
                className={styles.fileRemove}
                onClick={() => setSelectedFile(null)}
              >
                ✕
              </button>
            </div>
          )}

          <form className={styles.inputBar} onSubmit={handleSubmit}>
            <button
              type="button"
              className={styles.attachButtonNew}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              className={styles.hiddenFileInput}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setSelectedFile(file)
              }}
            />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              className={styles.textInputNew}
              rows={1}
              disabled={creating}
            />

            <button
              type="submit"
              className={styles.sendButtonNew}
              disabled={(!input.trim() && !selectedFile) || creating}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
