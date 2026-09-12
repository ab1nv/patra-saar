'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlaskConical,
  Ghost,
  LogOut,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Pin,
  PinOff,
  Scale,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { cn, formatRelative } from '@/lib/utils'
import type { CaseSummary } from '@/lib/chat-types'

const MIN_WIDTH = 200
const MAX_WIDTH = 420

export function CaseSidebar({
  cases,
  activeCaseId,
  email,
  width,
  collapsed,
  incognito,
  mobileOpen,
  onMobileClose,
  onWidth,
  onToggleCollapse,
  onToggleIncognito,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onPin,
  onLogout,
}: {
  cases: CaseSummary[]
  activeCaseId: string | null
  email: string
  width: number
  collapsed: boolean
  incognito: boolean
  mobileOpen: boolean
  onMobileClose: () => void
  onWidth: (w: number) => void
  onToggleCollapse: () => void
  onToggleIncognito: () => void
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onPin: (id: string, pinned: boolean) => void
  onLogout: () => void
}) {
  const dragging = useRef(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return
      onWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)))
    }
    function onUp() {
      dragging.current = false
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onWidth])

  const startResize = useCallback(() => {
    dragging.current = true
    document.body.style.userSelect = 'none'
  }, [])

  // Close the mobile drawer when resizing up to desktop.
  useEffect(() => {
    if (isDesktop) onMobileClose()
  }, [isDesktop, onMobileClose])

  const pinned = cases.filter((c) => c.pinned)
  const recent = cases.filter((c) => !c.pinned)
  const showRail = collapsed && isDesktop

  const select = (id: string) => {
    onSelect(id)
    onMobileClose()
  }
  const newChat = () => {
    onNew()
    onMobileClose()
  }

  return (
    <>
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onMobileClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-border bg-surface',
          'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'lg:static lg:z-auto lg:translate-x-0 lg:transition-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ width: showRail ? 56 : width, maxWidth: '86vw' }}
      >
        {showRail ? (
          <div className="flex h-full flex-col items-center gap-2 py-4">
            <Scale size={18} className="text-accent" />
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <PanelLeftOpen size={16} />
            </button>
            <button
              type="button"
              onClick={newChat}
              title="New Chat"
              className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <MessageSquarePlus size={16} />
            </button>
            <button
              type="button"
              onClick={onToggleIncognito}
              title={incognito ? 'Incognito on' : 'Incognito off'}
              className={cn(
                'rounded-md p-2 transition-colors hover:bg-surface-2',
                incognito ? 'text-accent' : 'text-muted hover:text-foreground',
              )}
            >
              <Ghost size={16} />
            </button>
            <div className="mt-auto flex flex-col items-center gap-2">
              <Link
                href="/#audit"
                title="Hallucination audit"
                className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <FlaskConical size={16} />
              </Link>
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <Link href="/" className="flex items-center gap-2">
                <Scale size={18} className="text-accent" />
                <span className="font-serif text-lg font-semibold">PatraSaar</span>
              </Link>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  className="hidden rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground lg:inline-flex"
                >
                  <PanelLeftClose size={16} />
                </button>
                <button
                  type="button"
                  onClick={onMobileClose}
                  title="Close sidebar"
                  className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2 p-3">
              <button
                type="button"
                onClick={newChat}
                className="flex w-full items-center gap-2 rounded-control border border-border bg-surface-2 px-3 py-2.5 text-xs font-medium transition-colors hover:border-border-strong active:scale-[.99]"
              >
                <MessageSquarePlus size={14} /> New Chat
              </button>

              <button
                type="button"
                onClick={onToggleIncognito}
                className={cn(
                  'flex w-full items-center justify-between rounded-control border px-3 py-2.5 text-xs transition-colors',
                  incognito
                    ? 'border-accent/40 bg-accent-soft text-foreground'
                    : 'border-border text-muted hover:text-foreground',
                )}
              >
                <span className="flex items-center gap-2">
                  <Ghost size={14} /> Incognito
                </span>
                <span
                  className={cn(
                    'relative h-4 w-7 rounded-full transition-colors',
                    incognito ? 'bg-accent' : 'bg-border-strong',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all',
                      incognito ? 'left-3.5' : 'left-0.5',
                    )}
                  />
                </span>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 pb-3">
              {pinned.length > 0 && <GroupLabel>Pinned</GroupLabel>}
              <div className="space-y-1">
                {pinned.map((c) => (
                  <CaseItem
                    key={c.id}
                    c={c}
                    active={c.id === activeCaseId}
                    onSelect={select}
                    onDelete={onDelete}
                    onRename={onRename}
                    onPin={onPin}
                  />
                ))}
              </div>

              {recent.length > 0 && <GroupLabel>Recent</GroupLabel>}
              {cases.length === 0 && (
                <p className="px-1 py-2 text-xs text-faint">Your inquiries will appear here.</p>
              )}
              <div className="space-y-1">
                {recent.map((c) => (
                  <CaseItem
                    key={c.id}
                    c={c}
                    active={c.id === activeCaseId}
                    onSelect={select}
                    onDelete={onDelete}
                    onRename={onRename}
                    onPin={onPin}
                  />
                ))}
              </div>
            </nav>

            <div className="border-t border-border p-3">
              <div className="mb-2 flex gap-1">
                <Link
                  href="/#audit"
                  className="flex flex-1 items-center justify-center gap-1 rounded-control border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:text-foreground"
                >
                  <FlaskConical size={12} /> Hallucination audit
                </Link>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-muted" title={email}>
                  {email}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted transition-colors hover:text-foreground"
                >
                  <LogOut size={12} /> Sign out
                </button>
              </div>
            </div>
          </>
        )}

        {isDesktop && !showRail && (
          <div
            onMouseDown={startResize}
            className="absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-accent/40"
            role="separator"
            aria-orientation="vertical"
          />
        )}
      </aside>
    </>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-2 text-[10px] uppercase tracking-wider text-faint">{children}</p>
}

function CaseItem({
  c,
  active,
  onSelect,
  onDelete,
  onRename,
  onPin,
}: {
  c: CaseSummary
  active: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onPin: (id: string, pinned: boolean) => void
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-control border px-2 py-1.5 text-xs transition-all duration-200',
        active
          ? 'border-accent/40 bg-accent-soft text-foreground'
          : 'border-transparent text-muted hover:border-border hover:bg-surface-2 hover:text-foreground',
      )}
    >
      <button type="button" onClick={() => onSelect(c.id)} className="min-w-0 flex-1 text-left">
        <span className="block truncate">{c.title}</span>
        <span className="block text-[10px] text-faint">{formatRelative(c.createdAt)}</span>
      </button>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-lg:opacity-100">
        <button
          type="button"
          onClick={() => onPin(c.id, !c.pinned)}
          aria-label={c.pinned ? 'Unpin' : 'Pin'}
          className="rounded p-1 text-faint transition-colors hover:text-accent"
        >
          {c.pinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = window.prompt('Rename inquiry', c.title)
            if (next && next.trim()) onRename(c.id, next.trim())
          }}
          aria-label="Rename"
          className="rounded p-1 text-faint transition-colors hover:text-foreground"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(c.id)}
          aria-label="Delete"
          className="rounded p-1 text-faint transition-colors hover:text-danger"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}
