'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  Ghost,
  LogOut,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Pin,
  PinOff,
  Scale,
  ScrollText,
  Library,
  Trash2,
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

  const pinned = cases.filter((c) => c.pinned)
  const recent = cases.filter((c) => !c.pinned)

  if (collapsed) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-surface py-4">
        <Scale size={18} className="text-accent" />
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand sidebar"
          className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <PanelLeftOpen size={16} />
        </button>
        <button
          type="button"
          onClick={onNew}
          title="New inquiry"
          className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <MessageSquarePlus size={16} />
        </button>
        <button
          type="button"
          onClick={onToggleIncognito}
          title={incognito ? 'Incognito on' : 'Incognito off'}
          className={cn(
            'rounded-md p-2 hover:bg-surface-2',
            incognito ? 'text-accent' : 'text-muted hover:text-foreground',
          )}
        >
          <Ghost size={16} />
        </button>
        <div className="mt-auto flex flex-col items-center gap-2">
          <Link
            href="/migrate"
            title="IPC ↔ BNS mapper"
            className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <ScrollText size={16} />
          </Link>
          <Link
            href="/coverage"
            title="Coverage ledger"
            className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <Library size={16} />
          </Link>
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="relative flex shrink-0 flex-col border-r border-border bg-surface"
      style={{ width }}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <Scale size={18} className="text-accent" />
          <span className="font-serif text-lg font-semibold">PatraSaar</span>
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Collapse sidebar"
          className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-medium hover:border-border-strong"
        >
          <MessageSquarePlus size={14} /> New inquiry
        </button>

        <button
          type="button"
          onClick={onToggleIncognito}
          className={cn(
            'flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs transition-colors',
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
              onSelect={onSelect}
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
              onSelect={onSelect}
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
            href="/migrate"
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] text-muted hover:text-foreground"
          >
            <ScrollText size={12} /> IPC ↔ BNS
          </Link>
          <Link
            href="/coverage"
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] text-muted hover:text-foreground"
          >
            <Library size={12} /> Coverage
          </Link>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-muted" title={email}>
            {email}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted hover:text-foreground"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>

      <div
        onMouseDown={startResize}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent/40"
        role="separator"
        aria-orientation="vertical"
      />
    </aside>
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
        'group flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors',
        active
          ? 'border-accent/40 bg-accent-soft text-foreground'
          : 'border-transparent text-muted hover:border-border hover:bg-surface-2 hover:text-foreground',
      )}
    >
      <button type="button" onClick={() => onSelect(c.id)} className="min-w-0 flex-1 text-left">
        <span className="block truncate">{c.title}</span>
        <span className="block text-[10px] text-faint">{formatRelative(c.createdAt)}</span>
      </button>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onPin(c.id, !c.pinned)}
          aria-label={c.pinned ? 'Unpin' : 'Pin'}
          className="rounded p-1 text-faint hover:text-accent"
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
          className="rounded p-1 text-faint hover:text-foreground"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(c.id)}
          aria-label="Delete"
          className="rounded p-1 text-faint hover:text-danger"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}
