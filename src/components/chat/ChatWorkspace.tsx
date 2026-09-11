'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ghost, Menu, Quote } from 'lucide-react'
import { Composer, type Attachment } from './Composer'
import { MessageBubble } from './MessageBubble'
import { SectionDrawer } from './SectionDrawer'
import { CaseSidebar } from './CaseSidebar'
import type { CaseSummary, ChatCitation, ChatMessage, StreamEvent } from '@/lib/chat-types'

type RawMessage = {
  id: string
  role: string
  content: string
  citationsJson: string | null
  abstained: boolean
}

type Selection = { x: number; y: number; text: string }

export function ChatWorkspace({
  initialCaseId,
  email,
}: {
  initialCaseId: string | null
  email: string
}) {
  const router = useRouter()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [caseId, setCaseId] = useState<string | null>(initialCaseId)
  const [title, setTitle] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [provider, setProvider] = useState('')
  const [citation, setCitation] = useState<ChatCitation | null>(null)
  const [incognito, setIncognito] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [pendingQuote, setPendingQuote] = useState<string | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [sidebarWidth, setSidebarWidth] = useState(264)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const caseIdRef = useRef<string | null>(initialCaseId)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  // Restore sidebar preferences.
  useEffect(() => {
    const w = Number(localStorage.getItem('ps.sidebarWidth'))
    if (w >= 200 && w <= 420) setSidebarWidth(w)
    if (localStorage.getItem('ps.sidebarCollapsed') === '1') setCollapsed(true)
  }, [])

  const changeWidth = useCallback((w: number) => {
    setSidebarWidth(w)
    localStorage.setItem('ps.sidebarWidth', String(w))
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      localStorage.setItem('ps.sidebarCollapsed', c ? '0' : '1')
      return !c
    })
  }, [])

  // Dynamic window title.
  useEffect(() => {
    if (incognito && !title) document.title = 'PatraSaar — Incognito'
    else if (title) document.title = `PatraSaar — ${title}`
    else document.title = 'PatraSaar'
  }, [title, incognito])

  const refreshCases = useCallback(async () => {
    try {
      const res = await fetch('/api/cases', { credentials: 'include' })
      if (!res.ok) return
      const data = (await res.json()) as { cases: CaseSummary[] }
      setCases(data.cases ?? [])
    } catch {
      /* keep current list */
    }
  }, [])

  const loadMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/cases/${id}`, { credentials: 'include' })
      if (!res.ok) {
        setMessages([])
        return
      }
      const data = (await res.json()) as { case: CaseSummary; messages: RawMessage[] }
      setTitle(data.case?.title ?? null)
      setMessages(
        (data.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
          citations: m.citationsJson ? (JSON.parse(m.citationsJson) as ChatCitation[]) : [],
          abstained: m.abstained,
        })),
      )
    } catch {
      setMessages([])
    }
  }, [])

  useEffect(() => {
    void refreshCases()
  }, [refreshCases])

  useEffect(() => {
    if (caseId) void loadMessages(caseId)
    else {
      setMessages([])
      setTitle(null)
    }
  }, [caseId, loadMessages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const updateLast = useCallback((fn: (m: ChatMessage) => ChatMessage) => {
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? fn(m) : m)))
  }, [])

  const handleEvent = useCallback(
    (evt: StreamEvent) => {
      switch (evt.type) {
        case 'meta':
          setProvider(evt.provider)
          if (evt.incognito) {
            caseIdRef.current = null
          }
          if (!evt.incognito && evt.caseId) {
            caseIdRef.current = evt.caseId
            setCaseId((prev) => prev ?? evt.caseId)
            window.history.replaceState(null, '', `/chat/${evt.caseId}`)
          }
          updateLast((m) => ({ ...m, abstained: evt.abstained }))
          break
        case 'token':
          updateLast((m) => ({ ...m, content: m.content + evt.value }))
          break
        case 'citations':
          updateLast((m) => ({
            ...m,
            citations: evt.value,
            verifiedCount: evt.verifiedCount,
            unverifiedCount: evt.unverifiedCount,
          }))
          break
        case 'title':
          setTitle(evt.title)
          if (!incognito) void refreshCases()
          break
        case 'done':
          if (!incognito) void refreshCases()
          break
      }
    },
    [incognito, refreshCases, updateLast],
  )

  const send = useCallback(
    async (question: string) => {
      const attachmentText = attachments.map((a) => a.text).join('\n\n')
      const selectionContext = pendingQuote ?? undefined

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: '' },
      ])
      setAttachments([])
      setPendingQuote(null)
      setStreaming(true)
      setNotice(null)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({
            question,
            caseId: incognito ? undefined : (caseIdRef.current ?? undefined),
            incognito,
            attachmentText: attachmentText || undefined,
            selectionContext,
          }),
        })

        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => ({}))) as { message?: string }
          throw new Error(data.message ?? 'Request failed')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const raw = line.slice(5).trim()
            if (!raw) continue
            try {
              handleEvent(JSON.parse(raw) as StreamEvent)
            } catch {
              /* skip malformed frame */
            }
          }
        }
      } catch (err) {
        const e = err as Error
        if (e.name !== 'AbortError') {
          updateLast((m) => ({ ...m, content: `${m.content}\n\n**Error:** ${e.message}` }))
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [attachments, handleEvent, incognito, pendingQuote, updateLast],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
  }, [])

  const newChat = useCallback(() => {
    caseIdRef.current = null
    setCaseId(null)
    setTitle(null)
    setMessages([])
    setAttachments([])
    setPendingQuote(null)
    window.history.replaceState(null, '', '/chat')
  }, [])

  const selectCase = useCallback((id: string) => {
    caseIdRef.current = id
    setCaseId(id)
    setIncognito(false)
    setMessages([])
    window.history.replaceState(null, '', `/chat/${id}`)
  }, [])

  const deleteCase = useCallback(
    async (id: string) => {
      await fetch(`/api/cases/${id}`, { method: 'DELETE', credentials: 'include' })
      if (caseIdRef.current === id) newChat()
      void refreshCases()
    },
    [newChat, refreshCases],
  )

  const renameCase = useCallback(
    async (id: string, nextTitle: string) => {
      await fetch(`/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: nextTitle }),
      })
      if (caseIdRef.current === id) setTitle(nextTitle)
      void refreshCases()
    },
    [refreshCases],
  )

  const pinCase = useCallback(
    async (id: string, pinned: boolean) => {
      await fetch(`/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pinned }),
      })
      void refreshCases()
    },
    [refreshCases],
  )

  const addFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch('/api/extract', {
          method: 'POST',
          body: form,
          credentials: 'include',
        })
        const data = (await res.json().catch(() => ({}))) as {
          name?: string
          chars?: number
          text?: string
          message?: string
        }
        if (!res.ok || !data.text) {
          setNotice(data.message ?? `Could not read ${file.name}`)
          continue
        }
        setAttachments((prev) => [
          ...prev,
          {
            name: data.name ?? file.name,
            chars: data.chars ?? data.text!.length,
            text: data.text!,
          },
        ])
      } catch {
        setNotice(`Could not read ${file.name}`)
      }
    }
  }, [])

  const toggleIncognito = useCallback(() => {
    setIncognito((v) => {
      const next = !v
      if (next) newChat()
      return next
    })
  }, [newChat])

  const onMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) {
      setSelection(null)
      return
    }
    const text = sel.toString().trim()
    if (text.length < 3 || text.length > 600) {
      setSelection(null)
      return
    }
    const range = sel.getRangeAt(0)
    const container = messagesRef.current
    if (!container || !container.contains(range.commonAncestorContainer)) {
      setSelection(null)
      return
    }
    const rect = range.getBoundingClientRect()
    setSelection({ x: rect.left + rect.width / 2, y: rect.top - 6, text })
  }, [])

  const crossQuestion = useCallback(() => {
    if (!selection) return
    setPendingQuote(selection.text)
    window.getSelection()?.removeAllRanges()
    setSelection(null)
    setFocusNonce((n) => n + 1)
  }, [selection])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
  }, [router])

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <CaseSidebar
        cases={cases}
        activeCaseId={caseId}
        email={email}
        width={sidebarWidth}
        collapsed={collapsed}
        incognito={incognito}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onWidth={changeWidth}
        onToggleCollapse={toggleCollapse}
        onToggleIncognito={toggleIncognito}
        onSelect={selectCase}
        onNew={newChat}
        onDelete={deleteCase}
        onRename={renameCase}
        onPin={pinCase}
        onLogout={logout}
      />

      <main className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="-ml-1 rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
            >
              <Menu size={18} />
            </button>
            <h1 className="truncate font-serif text-base sm:text-lg">{title ?? 'New inquiry'}</h1>
            {incognito && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] text-accent">
                <Ghost size={10} /> <span className="hidden sm:inline">Incognito — not saved</span>
                <span className="sm:hidden">Incognito</span>
              </span>
            )}
          </div>
          <span className="hidden shrink-0 text-[11px] text-faint sm:block">
            {provider === 'offline' ? 'Offline demo mode' : provider ? `Model: ${provider}` : ''}
          </span>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div
            ref={messagesRef}
            onMouseUp={onMouseUp}
            className="mx-auto flex max-w-3xl flex-col gap-6 sm:gap-7"
          >
            {messages.length === 0 && (
              <div className="mx-auto mt-20 max-w-lg text-center">
                <h2 className="font-serif text-3xl">How can I help with Indian law?</h2>
                <p className="mt-3 text-sm text-muted">
                  Ask about any section of the ten indexed acts and the Constitution. Every citation
                  is checked against the bare act, and if nothing relevant is found, I&apos;ll say
                  so instead of guessing.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    'What is the punishment for murder under the BNS?',
                    'Explain criminal breach of trust',
                    'Section 420 IPC',
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void send(q)}
                      className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs text-muted hover:border-border-strong hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <MessageBubble
                key={m.id ?? i}
                message={m}
                streaming={streaming && i === messages.length - 1 && m.role === 'assistant'}
                onOpenCitation={setCitation}
              />
            ))}
          </div>
        </div>

        {notice && <p className="px-4 pb-1 text-center text-xs text-warning sm:px-6">{notice}</p>}

        <Composer
          streaming={streaming}
          attachments={attachments}
          pendingQuote={pendingQuote}
          focusNonce={focusNonce}
          onSend={send}
          onStop={stop}
          onAddFiles={addFiles}
          onRemoveAttachment={(name) =>
            setAttachments((prev) => prev.filter((a) => a.name !== name))
          }
          onClearQuote={() => setPendingQuote(null)}
        />
      </main>

      <SectionDrawer citation={citation} onClose={() => setCitation(null)} />

      {selection && (
        <button
          type="button"
          onClick={crossQuestion}
          style={{ left: selection.x, top: selection.y }}
          className="fixed z-40 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg hover:border-border-strong"
        >
          <Quote size={11} className="mr-1 inline text-accent" />
          Cross-question
        </button>
      )}
    </div>
  )
}
