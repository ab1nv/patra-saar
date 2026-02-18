'use client'

import { Suspense, useRef, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, createSSEReader } from '@/lib/api'
import styles from './chat-layout.module.css'
import chatStyles from './[id]/chat-page.module.css'

interface Chat {
  id: string
  title: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: string | null
  created_at: string
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <ChatPageInner />
    </Suspense>
  )
}

function ChatPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatId = searchParams.get('id')
  const pendingQuery = searchParams.get('q')

  // If there's a chatId, show the conversation view; otherwise, show the new-chat view
  if (chatId) {
    return <ConversationView chatId={chatId} pendingQuery={pendingQuery} />
  }
  return <NewChatView />
}

// ─── New Chat View ──────────────────────────────────────────────────────────────

function NewChatView() {
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
        router.push(`/chat?id=${res.data.id}&q=${encodeURIComponent(input.trim())}`)
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

// ─── Conversation View ──────────────────────────────────────────────────────────

function ConversationView({ chatId, pendingQuery }: { chatId: string; pendingQuery: string | null }) {
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

  // Auto-send the pending query from the new-chat page
  useEffect(() => {
    if (pendingQuery && messages.length === 0) {
      // Small delay to let messages load first
      const timer = setTimeout(() => {
        sendTextMessage(pendingQuery)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [pendingQuery, chatId])

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

  function sendTextMessage(text: string) {
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setStreaming(true)
    setStreamContent('')

    createSSEReader(
      `/api/chats/${chatId}/messages`,
      JSON.stringify({ content: text }),
      (token) => {
        setStreamContent((prev) => prev + token)
      },
      (messageId) => {
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
          pollJobStatus(res.data.jobId, userText)
        }
      } catch (err) {
        console.error('Upload failed:', err)
      }
      return
    }

    sendTextMessage(userText)
  }

  async function pollJobStatus(jobId: string, pendingQ: string) {
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
            await loadMessages()
            if (pendingQ) {
              sendTextMessage(pendingQ)
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
    <div className={chatStyles.chatPage}>
      {/* Messages */}
      <div className={chatStyles.messagesContainer}>
        <div className={chatStyles.messagesInner}>
          {messages.length === 0 && !streaming && (
            <div className={chatStyles.welcomeMessage}>
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
              className={`${chatStyles.messageBubble} ${
                msg.role === 'user' ? chatStyles.userMessage : chatStyles.assistantMessage
              }`}
            >
              <div className={chatStyles.messageRole}>
                {msg.role === 'user' ? 'You' : 'PatraSaar'}
              </div>
              <div className={chatStyles.messageContent}>
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {streaming && streamContent && (
            <div className={`${chatStyles.messageBubble} ${chatStyles.assistantMessage}`}>
              <div className={chatStyles.messageRole}>PatraSaar</div>
              <div className={chatStyles.messageContent}>
                {streamContent.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                <span className={chatStyles.cursor} aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {processing && (
            <div className={chatStyles.processingBar}>
              <div className={chatStyles.processingLabel}>
                Processing document: {processing.status}
              </div>
              <div className={chatStyles.progressTrack}>
                <div
                  className={chatStyles.progressFill}
                  style={{ width: `${processing.progress}%` }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <form className={chatStyles.inputArea} onSubmit={handleSubmit}>
        <div className={chatStyles.inputInner}>
          {selectedFile && (
            <div className={chatStyles.filePreview}>
              <span>📎 {selectedFile.name}</span>
              <button type="button" onClick={() => setSelectedFile(null)}>
                ✕
              </button>
            </div>
          )}

          <div className={chatStyles.inputRow}>
            <button
              type="button"
              className={chatStyles.attachButton}
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
              className={chatStyles.hiddenFileInput}
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
              className={chatStyles.textInput}
              rows={1}
              disabled={streaming}
            />

            <button
              type="submit"
              className={chatStyles.sendButton}
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
