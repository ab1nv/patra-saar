'use client'

import { Suspense, useRef, useEffect, useState } from 'react'
<<<<<<< master
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
=======
import { useRouter, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { api, createSSEReader } from '@/lib/api'
>>>>>>> master
import styles from './chat-layout.module.css'
import chatStyles from './[id]/chat-page.module.css'

interface Chat {
  id: string
  title: string
}

<<<<<<< master
interface KbCategory {
  id: string
  slug: string
  name: string
  description: string | null
=======
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: string | null
  created_at: string
}

interface DualVerifiedCitation {
  refNumber: number
  sourceType: 'kb' | 'doc'
  valid: boolean
  snippet: string
  sectionRef?: string
  sourceTitle?: string
  documentId?: string
}

function CitationList({ citationsJson }: { citationsJson: string | null | undefined }) {
  if (!citationsJson) return null
  let citations: DualVerifiedCitation[]
  try {
    citations = JSON.parse(citationsJson)
  } catch {
    return null
  }
  const valid = citations.filter((c) => c.valid)
  if (valid.length === 0) return null

  return (
    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {valid.map((c, i) => {
        const isKb = c.sourceType === 'kb'
        const label = isKb
          ? `[KB-${c.refNumber}] ${c.sourceTitle ?? ''}${c.sectionRef ? ` — ${c.sectionRef}` : ''}`
          : `[DOC-${c.refNumber}]${c.sectionRef ? ` ${c.sectionRef}` : ''}`
        return (
          <span
            key={i}
            title={c.snippet}
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              background: isKb ? 'rgba(180,130,0,0.12)' : 'rgba(30,100,220,0.10)',
              color: isKb ? 'var(--accent-warning, #b47f00)' : 'var(--accent-primary, #1e64dc)',
              border: `1px solid ${isKb ? 'rgba(180,130,0,0.25)' : 'rgba(30,100,220,0.20)'}`,
              cursor: 'default',
            }}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
>>>>>>> master
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
<<<<<<< master
      <NewChatView />
=======
      <ChatPageInner />
>>>>>>> master
    </Suspense>
  )
}

<<<<<<< master
=======
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

interface KbCategory {
  id: string
  slug: string
  name: string
  description: string | null
}

>>>>>>> master
function NewChatView() {
  const [input, setInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [categories, setCategories] = useState<KbCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    textareaRef.current?.focus()
    api<{ data: KbCategory[] }>('/api/categories')
      .then((res) => setCategories(res.data))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if ((!input.trim() && !selectedFile) || creating) return
    setCreating(true)
    setSubmitted(true)

    try {
      const res = await api<{ data: Chat }>('/api/chats', {
        method: 'POST',
        json: { categoryId: selectedCategoryId },
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

        {/* Category selection */}
        {categories.length > 0 && !submitted && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: `1px solid ${selectedCategoryId === null ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                background: selectedCategoryId === null ? 'var(--accent-primary)' : 'transparent',
                color: selectedCategoryId === null ? 'var(--text-inverse)' : 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              General
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                title={cat.description ?? undefined}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: `1px solid ${selectedCategoryId === cat.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  background: selectedCategoryId === cat.id ? 'var(--accent-primary)' : 'transparent',
                  color: selectedCategoryId === cat.id ? 'var(--text-inverse)' : 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

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
      // File upload path — API returns SSE stream (inline processing)
      const formData = new FormData()
      if (userText) formData.append('content', userText)
      formData.append('file', selectedFile)

      setProcessing({ status: 'uploading', progress: 10 })
      if (userText) {
        setStreaming(true)
        setStreamContent('')
      }

      createSSEReader(
        `/api/chats/${chatId}/messages`,
        formData,
        (token) => setStreamContent((prev) => prev + token),
        (_messageId) => {
          setStreaming(false)
          setProcessing(null)
          loadMessages()
          setStreamContent('')
        },
        (error) => {
          setStreaming(false)
          setProcessing(null)
          setStreamContent('')
          console.error('Upload stream error:', error)
        },
        (stage, progress) => {
          setProcessing({ status: stage, progress })
        },
      )
      return
    }

    sendTextMessage(userText)
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
                {msg.role === 'assistant' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content.split('\n').map((line, i) => <p key={i}>{line}</p>)
                )}
                {msg.role === 'assistant' && <CitationList citationsJson={msg.citations} />}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {streaming && streamContent && (
            <div className={`${chatStyles.messageBubble} ${chatStyles.assistantMessage}`}>
              <div className={chatStyles.messageRole}>PatraSaar</div>
              <div className={chatStyles.messageContent}>
                <ReactMarkdown>{streamContent}</ReactMarkdown>
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
