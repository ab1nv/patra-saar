'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'
import { Check, Copy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ChatCitation, ChatMessage } from '@/lib/chat-types'

const CITATION_TOKEN = /\[\[\s*[^|\]]+?\s*\|\s*["“][\s\S]*?["”]\s*\]\]/g

/** Replace [[ACT s.N | "quote"]] tokens with numbered links into the citation list. */
function prepareContent(content: string): string {
  let n = 0
  return content.replace(CITATION_TOKEN, () => {
    n += 1
    return ` [${n}](#cite-${n}) `
  })
}

export function MessageBubble({
  message,
  streaming,
  onOpenCitation,
}: {
  message: ChatMessage
  streaming?: boolean
  onOpenCitation: (citation: ChatCitation) => void
}) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const citations = message.citations ?? []
  const verified = citations.filter((c) => c.verified)
  const unverified = citations.filter((c) => !c.verified)

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content.replace(CITATION_TOKEN, '').trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className={cn('flex animate-fade-up gap-3 sm:gap-4', isUser && 'justify-end')}>
      {!isUser && (
        <div className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface sm:flex">
          <Image src="/logo.png" alt="" width={16} height={16} />
        </div>
      )}

      <div className={cn('w-full max-w-3xl', isUser && 'flex justify-end')}>
        {isUser ? (
          <div className="max-w-[92%] rounded-2xl rounded-tr-sm border border-border bg-surface-2 px-4 py-3 text-sm">
            {message.content}
          </div>
        ) : (
          <div className="group rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-4 shadow-soft transition-colors duration-300 hover:border-border-strong sm:px-6 sm:py-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {verified.length > 0 && <Badge tone="verified">✓ {verified.length} verified</Badge>}
                {unverified.length > 0 && (
                  <Badge tone="warning">⚠ {unverified.length} unverified</Badge>
                )}
                {message.abstained && <Badge tone="neutral">abstained</Badge>}
              </div>
              <button
                type="button"
                onClick={copy}
                aria-label="Copy answer"
                className="shrink-0 rounded-md p-1.5 text-faint opacity-0 transition-all hover:bg-surface-2 hover:text-foreground group-hover:opacity-100"
              >
                {copied ? <Check size={13} className="text-verified" /> : <Copy size={13} />}
              </button>
            </div>

            <div className="prose-patrasaar">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => {
                    if (href?.startsWith('#cite-')) {
                      const idx = Number(href.slice(6)) - 1
                      const citation = citations[idx]
                      return (
                        <button
                          type="button"
                          onClick={() => citation && onOpenCitation(citation)}
                          className={cn(
                            'mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 align-super text-[10px] font-semibold transition-transform hover:scale-110',
                            citation?.verified
                              ? 'border-verified/40 bg-verified-soft text-verified'
                              : 'border-warning/40 bg-warning-soft text-warning',
                          )}
                          title={citation?.verified ? 'Verified citation' : 'Unverified citation'}
                        >
                          {children}
                        </button>
                      )
                    }
                    return (
                      <a href={href} target="_blank" rel="noreferrer">
                        {children}
                      </a>
                    )
                  },
                }}
              >
                {prepareContent(message.content)}
              </ReactMarkdown>
              {streaming && <span className="caret" />}
            </div>

            {citations.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-border pt-4">
                {citations.map((c) => (
                  <button
                    key={c.index}
                    type="button"
                    onClick={() => onOpenCitation(c)}
                    className={cn(
                      'block w-full rounded-control border px-3 py-2 text-left text-xs transition-all duration-200 hover:-translate-y-0.5',
                      c.verified
                        ? 'border-verified/25 bg-verified-soft/40 hover:border-verified/50'
                        : 'border-warning/25 bg-warning-soft/40 hover:border-warning/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          'text-xs font-medium tracking-tight',
                          c.verified ? 'text-verified' : 'text-warning',
                        )}
                      >
                        <span className="font-semibold">{c.verified ? '✓' : '⚠'}</span>{' '}
                        {c.actFull ?? c.actName} · Section {c.number}
                        {c.title ? ` - ${c.title}` : ''}
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-faint">
                        {c.verified ? 'verified' : (c.failureReason ?? 'unverified')}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mt-1 line-clamp-2 font-serif text-[13px] leading-relaxed text-muted',
                        !c.verified && 'line-through decoration-warning/50',
                      )}
                    >
                      “{c.quote}”
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
