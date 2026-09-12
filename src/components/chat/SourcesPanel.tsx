'use client'

import { BookOpen, ShieldCheck, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatCitation } from '@/lib/chat-types'

export function SourcesPanel({
  citations,
  onOpenCitation,
  className,
}: {
  citations: ChatCitation[]
  onOpenCitation: (citation: ChatCitation) => void
  className?: string
}) {
  const verified = citations.filter((c) => c.verified).length

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-faint">
          <BookOpen size={13} className="text-accent" /> Sources &amp; acts
        </span>
        <span className="text-[11px] text-faint">
          {verified} verified
          {citations.length > verified ? ` · ${citations.length - verified} unverified` : ''}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {citations.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-faint">
            Retrieved sections will appear here as the answer streams.
          </p>
        )}

        {citations.map((c) => (
          <button
            key={`${c.sectionId ?? `${c.actName}-${c.number}`}-${c.index}`}
            type="button"
            onClick={() => onOpenCitation(c)}
            className={cn(
              'block w-full animate-fade-up rounded-control border px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5',
              c.verified
                ? 'border-verified/25 bg-verified-soft/30 hover:border-verified/50'
                : 'border-warning/25 bg-warning-soft/30 hover:border-warning/50',
            )}
          >
            <div className="flex items-start gap-2">
              {c.verified ? (
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-verified" />
              ) : (
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {c.actFull ?? c.actName} · Section {c.number}
                  {c.subsection ? `(${c.subsection})` : ''}
                </p>
                {c.title && <p className="mt-0.5 truncate text-[11px] text-muted">{c.title}</p>}
                {!c.verified && (
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-warning">
                    {c.failureReason ?? 'unverified'}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
