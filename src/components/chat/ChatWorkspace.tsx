'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ghost, Menu, PanelRight, Quote } from 'lucide-react'
import { Composer } from './Composer'
import { MessageBubble } from './MessageBubble'
import { SectionDrawer } from './SectionDrawer'
import { CaseSidebar } from './CaseSidebar'
import { SourcesPanel } from './SourcesPanel'
import type { CaseSummary, ChatCitation, ChatMessage, StreamEvent } from '@/lib/chat-types'

type RawMessage = {
  id: string
  role: string
  content: string
  citationsJson: string | null
  abstained: boolean
}

type Selection = { x: number; y: number; text: string }

const CASES_CACHE_KEY = 'ps.cases.v1'
const EXAMPLE_COUNT = 3

// Pool of prompts the benchmark covers well, so demo answers land with verified citations.
const EXAMPLE_POOL = [
  'What is the punishment for murder under BNS section 103?',
  'How is a first information report recorded under CrPC section 154?',
  'What does Article 21 of the Constitution protect?',
  'When may a police officer arrest a person without a warrant under BNSS section 35?',
  'What is criminal breach of trust under BNS section 316?',
  'What is the punishment for defamation under IPC section 499?',
  'What is the punishment for cheating under BNS section 318?',
  'What does Article 14 of the Constitution guarantee?',
  'How is a suit stayed under CPC section 10?',
  'What is the offence of tampering with computer source documents under IT Act section 65?',
  'What agreements are contracts under Indian Contract Act section 10?',
  'How is information about a cognizable offence recorded under BNSS section 173?',
]

function pickExamples(): string[] {
  const pool = [...EXAMPLE_POOL]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, EXAMPLE_COUNT)
}

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
  const [model, setModel] = useState('')
  const [citation, setCitation] = useState<ChatCitation | null>(null)
  const [incognito, setIncognito] = useState(false)
  const [pendingQuote, setPendingQuote] = useState<string | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [sidebarWidth, setSidebarWidth] = useState(264)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [examples, setExamples] = useState<string[]>(() => EXAMPLE_POOL.slice(0, EXAMPLE_COUNT))

  const caseIdRef = useRef<string | null>(initialCaseId)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const messagesCache = useRef<Map<string, ChatMessage[]>>(new Map())
  const freshCaseRef = useRef<string | null>(null)

  // Restore sidebar preferences and cached chat list for an instant first paint.
  useEffect(() => {
    const w = Number(localStorage.getItem('ps.sidebarWidth'))
    if (w >= 200 && w <= 420) setSidebarWidth(w)
    if (localStorage.getItem('ps.sidebarCollapsed') === '1') setCollapsed(true)
    setExamples(pickExamples())
    try {
      const cached = localStorage.getItem(CASES_CACHE_KEY)
      if (cached) setCases(JSON.parse(cached) as CaseSummary[])
    } catch {
      /* ignore cache errors */
    }
  }, [])

  // Show the active model immediately, before the first answer arrives.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/health')
        if (!res.ok) return
        const data = (await res.json()) as { provider?: string; model?: string }
        if (cancelled) return
        if (data.provider) setProvider(data.provider)
        if (data.model) setModel(data.model)
      } catch {
        /* keep the fallback label */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CASES_CACHE_KEY, JSON.stringify(cases.slice(0, 60)))
    } catch {
      /* ignore quota errors */
    }
  }, [cases])

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

  useEffect(() => {
    if (incognito && !title) document.title = 'PatraSaar - Incognito'
    else if (title) document.title = `PatraSaar - ${title}`
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

  const fetchMessages = useCallback(async (id: string): Promise<ChatMessage[]> => {
    const res = await fetch(`/api/cases/${id}`, { credentials: 'include' })
    if (!res.ok) return []
    const data = (await res.json()) as { case: CaseSummary; messages: RawMessage[] }
    if (data.case?.title) setTitle(data.case.title)
    return (data.messages ?? []).map((m) => ({
      id: m.id,
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
      citations: m.citationsJson ? (JSON.parse(m.citationsJson) as ChatCitation[]) : [],
      abstained: m.abstained,
    }))
  }, [])

  useEffect(() => {
    void refreshCases()
  }, [refreshCases])

  // Switching chats renders instantly from cache, then revalidates in the background.
  useEffect(() => {
    if (!caseId) {
      setMessages([])
      setTitle(null)
      return
    }
    // A case created by the message we are currently streaming has nothing
    // persisted yet; loading it would wipe the in-flight answer.
    if (freshCaseRef.current === caseId) {
      freshCaseRef.current = null
      return
    }
    const cached = messagesCache.current.get(caseId)
    if (cached) setMessages(cached)
    let cancelled = false
    void (async () => {
      const fresh = await fetchMessages(caseId).catch(() => [])
      if (cancelled || freshCaseRef.current === caseId) return
      messagesCache.current.set(caseId, fresh)
      setMessages(fresh)
    })()
    return () => {
      cancelled = true
    }
  }, [caseId, fetchMessages])

  // Keep the in-memory cache warm as messages change.
  useEffect(() => {
    if (caseId && messages.length > 0) messagesCache.current.set(caseId, messages)
  }, [caseId, messages])

  // Unique sources cited across the conversation, newest first.
  const sources = useMemo(() => {
    const seen = new Set<string>()
    const out: ChatCitation[] = []
    for (const m of messages) {
      if (m.role !== 'assistant') continue
      for (const c of m.citations ?? []) {
        const key = c.sectionId ?? `${c.actName}:${c.number}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(c)
      }
    }
    return out
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const updateLast = useCallback((fn: (m: ChatMessage) => ChatMessage) => {
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? fn(m) : m)))
  }, [])

  const handleEvent = useCallback(
    (evt: StreamEvent) => {
      switch (evt.type) {
        case 'meta': {
          setProvider(evt.provider)
          setModel(evt.model)
          if (evt.incognito) {
            caseIdRef.current = null
          }
          if (!evt.incognito && evt.caseId) {
            const id = evt.caseId
            caseIdRef.current = id
            // Mark this case as freshly created so the loader does not clobber
            // the answer currently streaming into it.
            freshCaseRef.current = id
            setCaseId((prev) => prev ?? id)
            window.history.replaceState(null, '', `/chat/${id}`)
            // Show the new chat in the sidebar immediately, before any title arrives.
            setCases((prev) =>
              prev.some((c) => c.id === id)
                ? prev
                : [{ id, title: 'New Chat', pinned: false, createdAt: Date.now() }, ...prev],
            )
          }
          updateLast((m) => ({ ...m, abstained: evt.abstained }))
          break
        }
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
          if (evt.caseId) {
            setCases((prev) =>
              prev.map((c) => (c.id === evt.caseId ? { ...c, title: evt.title } : c)),
            )
          }
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
      const selectionContext = pendingQuote ?? undefined

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: '' },
      ])
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
    [handleEvent, incognito, pendingQuote, updateLast],
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
    setPendingQuote(null)
    window.history.replaceState(null, '', '/chat')
  }, [])

  const selectCase = useCallback((id: string) => {
    caseIdRef.current = id
    setIncognito(false)
    setCaseId(id)
    setMessages(messagesCache.current.get(id) ?? [])
    window.history.replaceState(null, '', `/chat/${id}`)
  }, [])

  // Optimistic: remove from the UI immediately, delete in the background.
  const deleteCase = useCallback(
    async (id: string) => {
      setCases((prev) => prev.filter((c) => c.id !== id))
      messagesCache.current.delete(id)
      if (caseIdRef.current === id) newChat()
      try {
        await fetch(`/api/cases/${id}`, { method: 'DELETE', credentials: 'include' })
      } catch {
        void refreshCases()
      }
    },
    [newChat, refreshCases],
  )

  // Optimistic: update locally, persist in the background.
  const renameCase = useCallback(
    async (id: string, nextTitle: string) => {
      setCases((prev) => prev.map((c) => (c.id === id ? { ...c, title: nextTitle } : c)))
      if (caseIdRef.current === id) setTitle(nextTitle)
      try {
        await fetch(`/api/cases/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: nextTitle }),
        })
      } catch {
        void refreshCases()
      }
    },
    [refreshCases],
  )

  const pinCase = useCallback(
    async (id: string, pinned: boolean) => {
      setCases((prev) => prev.map((c) => (c.id === id ? { ...c, pinned } : c)))
      try {
        await fetch(`/api/cases/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ pinned }),
        })
      } catch {
        void refreshCases()
      }
    },
    [refreshCases],
  )

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
            <h1 className="truncate font-serif text-base sm:text-lg">{title ?? 'New Chat'}</h1>
            {incognito && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] text-accent">
                <Ghost size={10} /> <span className="hidden sm:inline">Incognito - not saved</span>
                <span className="sm:hidden">Incognito</span>
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {sources.length > 0 && (
              <button
                type="button"
                onClick={() => setSourcesOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:text-foreground xl:hidden"
              >
                <PanelRight size={13} /> Sources
                <span className="rounded-full bg-surface-2 px-1.5 text-[10px] text-faint">
                  {sources.length}
                </span>
              </button>
            )}
            <span className="hidden font-mono text-[10px] text-faint sm:block" title={model}>
              {model}
            </span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div
            ref={messagesRef}
            onMouseUp={onMouseUp}
            className="mx-auto flex max-w-3xl flex-col gap-6 sm:gap-7"
          >
            {messages.length === 0 && (
              <div className="mx-auto mt-16 max-w-lg text-center sm:mt-20">
                <h2 className="font-serif text-3xl">How can I help with Indian law?</h2>
                <p className="mt-3 text-sm text-muted">
                  Ask about any section of the ten indexed acts and the Constitution. Every citation
                  is checked against the bare act, and if nothing relevant is found, I&apos;ll say
                  so instead of guessing.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {examples.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void send(q)}
                      className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs text-muted transition-all hover:-translate-y-0.5 hover:border-border-strong hover:text-foreground"
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
          model={model || (provider === 'offline' ? 'offline demo mode' : 'connecting...')}
          pendingQuote={pendingQuote}
          focusNonce={focusNonce}
          onSend={send}
          onStop={stop}
          onClearQuote={() => setPendingQuote(null)}
        />
      </main>

      {sources.length > 0 && (
        <aside className="hidden w-80 shrink-0 border-l border-border bg-surface xl:flex">
          <SourcesPanel
            citations={sources}
            onOpenCitation={setCitation}
            className="w-full animate-slide-in-right"
          />
        </aside>
      )}

      {/* Sources overlay for smaller screens */}
      {sourcesOpen && (
        <div className="fixed inset-0 z-50 flex justify-end xl:hidden">
          <button
            type="button"
            aria-label="Close sources"
            onClick={() => setSourcesOpen(false)}
            className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm"
          />
          <div className="relative h-full w-full max-w-sm animate-slide-in-right border-l border-border bg-surface">
            <SourcesPanel
              citations={sources}
              onOpenCitation={(c) => {
                setCitation(c)
                setSourcesOpen(false)
              }}
            />
          </div>
        </div>
      )}

      <SectionDrawer citation={citation} onClose={() => setCitation(null)} />

      {selection && (
        <button
          type="button"
          onClick={crossQuestion}
          style={{ left: selection.x, top: selection.y }}
          className="fixed z-40 -translate-x-1/2 -translate-y-full animate-scale-in whitespace-nowrap rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lift hover:border-border-strong"
        >
          <Quote size={11} className="mr-1 inline text-accent" />
          Cross-question
        </button>
      )}
    </div>
  )
}
