'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ChatCitation } from '@/lib/chat-types'

type SectionDetail = {
  id: string
  act: string
  actFull: string
  number: string
  title: string
  text: string
}

export function SectionDrawer({
  citation,
  onClose,
}: {
  citation: ChatCitation | null
  onClose: () => void
}) {
  const [section, setSection] = useState<SectionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!citation) return
    let cancelled = false
    setSection(null)
    setError(null)

    const url = `/api/sections/${encodeURIComponent(citation.actName)}/${encodeURIComponent(citation.number)}`
    fetch(url, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Section not available')
        const data = (await res.json()) as { section: SectionDetail }
        if (!cancelled) setSection(data.section)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })

    return () => {
      cancelled = true
    }
  }, [citation])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!citation) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm"
      />
      <aside className="relative flex h-full w-full max-w-xl animate-slide-in-right flex-col border-l border-border bg-surface shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={citation.verified ? 'verified' : 'warning'}>
                {citation.verified
                  ? '✓ verified verbatim'
                  : `⚠ ${citation.failureReason ?? 'unverified'}`}
              </Badge>
              {section && <Badge tone="accent">{section.actFull}</Badge>}
              {citation.subsection && (
                <Badge tone="accent">sub-section ({citation.subsection})</Badge>
              )}
            </div>
            <h2 className="font-serif text-xl font-semibold">
              {section
                ? `${section.actFull}, Section ${section.number}`
                : `${citation.actName} s.${citation.number}`}
            </h2>
            {section && <p className="mt-1 text-sm text-muted">{section.title}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {error && <p className="text-sm text-danger">{error}</p>}
          {!error && !section && (
            <p className="text-sm text-faint animate-shimmer">Loading section text…</p>
          )}
          {section && (
            <>
              <div className="mb-4 rounded-lg border border-border bg-surface-2 p-4">
                <p className="text-[11px] uppercase tracking-wider text-faint">
                  Quoted by the model
                </p>
                <p
                  className={cn(
                    'mt-1 font-serif text-sm leading-relaxed',
                    citation.verified ? 'text-foreground' : 'text-warning line-through',
                  )}
                >
                  “{citation.quote}”
                </p>
              </div>
              <p className="mb-2 text-[11px] uppercase tracking-wider text-faint">
                Verbatim text from the indexed act
              </p>
              <p className="statute whitespace-pre-wrap text-muted">
                {highlightSubsection(section.text, citation.subsection)}
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * When the model cited a sub-section (e.g. "BNS s.318(2)"), highlight that
 * paragraph inside the full section text so the reader's eye lands on it.
 */
function highlightSubsection(text: string, subsection?: string) {
  if (!subsection) return text

  const marker = new RegExp(`\\(\\s*${escapeRegExp(subsection)}\\s*\\)`)
  const match = marker.exec(text)
  if (!match) return text

  const start = match.index
  const afterMarker = text.slice(start + match[0].length)
  const nextMarker = afterMarker.search(/\(\s*(?:\d+|[a-zA-Z])\s*\)/)
  const end = nextMarker >= 0 ? start + match[0].length + nextMarker : text.length

  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-accent-soft px-1 text-foreground ring-1 ring-accent/30">
        {text.slice(start, end).trimEnd()}
      </mark>
      {text.slice(end)}
    </>
  )
}
