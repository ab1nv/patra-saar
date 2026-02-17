'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { api, createSSEReader } from '@/lib/api'
import styles from './chat-page.module.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: string | null
  created_at: string
}

export default function ChatPage() {
  const params = useParams()
  const chatId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [processing, setProcessing] = useState<{ status: string; progress: number } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadMessages()
  }, [chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamContent])

  async function loadMessages() {
    try {
      const res = await api<{ data: { chat: any; messages: Message[] } }>(`/api/chats/${chatId}`)
      setMessages(res.data.messages)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if ((!input.trim() && !selectedFile) || streaming) return

    const userText = input.trim()
    setInput('')
    setSelectedFile(null)

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: selectedFile
        ? `${userText ? userText + '\n' : ''}[Uploaded: ${selectedFile.name}]`
        : userText,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    if (selectedFile) {
      // File upload path
      const formData = new FormData()
      if (userText) formData.append('content', userText)
      formData.append('file', selectedFile)

      try {
        const res = await api<{ data: { jobId: string; hasQuery: boolean } }>(
          `/api/chats/${chatId}/messages`,
          { method: 'POST', body: formData },
        )

        if (res.data.jobId) {
          // Poll for processing status
          pollJobStatus(res.data.jobId, userText)
        }
      } catch (err) {
        console.error('Upload failed:', err)
      }
      return
    }

    // Text-only query -> stream response
    setStreaming(true)
    setStreamContent('')

    createSSEReader(
      `/api/chats/${chatId}/messages`,
      JSON.stringify({ content: userText }),
      (token) => {
        setStreamContent((prev) => prev + token)
      },
      (messageId) => {
        setStreaming(false)
        loadMessages() // reload to get server-saved messages
        setStreamContent('')
      },
      (error) => {
        setStreaming(false)
        setStreamContent('')
        console.error('Stream error:', error)
      },
    )
  }

  async function pollJobStatus(jobId: string, pendingQuery: string) {
    setProcessing({ status: 'queued', progress: 0 })

    const interval = setInterval(async () => {
      try {
        const res = await api<{ data: { status: string; progress: number } }>(
          `/api/chats/jobs/${jobId}/status`,
        )
        const { status, progress } = res.data
        setProcessing({ status, progress })

        if (status === 'ready' || status === 'failed') {
          clearInterval(interval)
          setProcessing(null)

          if (status === 'ready') {
            // Reload messages to show the updated document
            await loadMessages()

            // If user had a query, now send it
            if (pendingQuery) {
              setStreaming(true)
              setStreamContent('')

              createSSEReader(
                `/api/chats/${chatId}/messages`,
                JSON.stringify({ content: pendingQuery }),
                (token) => setStreamContent((prev) => prev + token),
                () => {
                  setStreaming(false)
                  loadMessages()
                  setStreamContent('')
                },
                (error) => {
                  setStreaming(false)
                  setStreamContent('')
                  console.error('Stream error:', error)
                },
              )
            }
          }
        }
      } catch {
        clearInterval(interval)
        setProcessing(null)
      }
    }, 2000)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className={styles.chatPage}>
      {/* Messages */}
      <div className={styles.messagesContainer}>
        <div className={styles.messagesInner}>
          {messages.length === 0 && !streaming && (
            <div className={styles.welcomeMessage}>
              <h2>Welcome to PatraSaar</h2>
              <p>
                Upload a legal document (PDF, DOCX, TXT) and ask questions about it. Or just type
                a legal question directly.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.messageBubble} ${
                msg.role === 'user' ? styles.userMessage : styles.assistantMessage
              }`}
            >
              <div className={styles.messageRole}>
                {msg.role === 'user' ? 'You' : 'PatraSaar'}
              </div>
              <div className={styles.messageContent}>
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {streaming && streamContent && (
            <div className={`${styles.messageBubble} ${styles.assistantMessage}`}>
              <div className={styles.messageRole}>PatraSaar</div>
              <div className={styles.messageContent}>
                {streamContent.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                <span className={styles.cursor} aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {processing && (
            <div className={styles.processingBar}>
              <div className={styles.processingLabel}>
                Processing document: {processing.status}
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${processing.progress}%` }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <form className={styles.inputArea} onSubmit={handleSubmit}>
        <div className={styles.inputInner}>
          {selectedFile && (
            <div className={styles.filePreview}>
              <span>📎 {selectedFile.name}</span>
              <button type="button" onClick={() => setSelectedFile(null)}>
                ✕
              </button>
            </div>
          )}

          <div className={styles.inputRow}>
            <button
              type="button"
              className={styles.attachButton}
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
              placeholder="Ask about your document..."
              className={styles.textInput}
              rows={1}
              disabled={streaming}
            />

            <button
              type="submit"
              className={styles.sendButton}
              disabled={(!input.trim() && !selectedFile) || streaming}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
