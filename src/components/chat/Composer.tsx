'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Paperclip, Quote, Send, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Attachment = { name: string; chars: number; text: string }

export function Composer({
  streaming,
  attachments,
  pendingQuote,
  focusNonce,
  onSend,
  onStop,
  onAddFiles,
  onRemoveAttachment,
  onClearQuote,
}: {
  streaming: boolean
  attachments: Attachment[]
  pendingQuote: string | null
  focusNonce: number
  onSend: (question: string) => void
  onStop: () => void
  onAddFiles: (files: File[]) => void
  onRemoveAttachment: (name: string) => void
  onClearQuote: () => void
}) {
  const [value, setValue] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (focusNonce > 0) textRef.current?.focus()
  }, [focusNonce])

  function submit() {
    const q = value.trim()
    if (!q || streaming) return
    setValue('')
    onSend(q)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="bg-background px-6 pb-5 pt-2">
      <div className="mx-auto max-w-3xl">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <span
                key={a.name}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs"
              >
                <FileText size={12} className="text-accent" />
                <span className="max-w-[180px] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(a.name)}
                  className="text-faint hover:text-danger"
                  aria-label={`Remove ${a.name}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {pendingQuote && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs">
            <Quote size={12} className="mt-0.5 shrink-0 text-accent" />
            <span className="line-clamp-2 flex-1 text-foreground">{pendingQuote}</span>
            <button
              type="button"
              onClick={onClearQuote}
              className="text-faint hover:text-danger"
              aria-label="Clear quote"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-surface p-2 shadow-sm transition-colors focus-within:border-border-strong">
          <textarea
            ref={textRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={
              pendingQuote ? 'Ask about the selected passage…' : 'Ask about an indexed section…'
            }
            className="max-h-52 min-h-[52px] w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-faint"
          />
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md,text/plain,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  if (files.length) onAddFiles(files)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Attach a document"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <Paperclip size={14} /> Attach
              </button>
            </div>

            {streaming ? (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-danger-soft px-3 text-xs font-medium text-danger"
              >
                <Square size={13} fill="currentColor" /> Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!value.trim()}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-background',
                  !value.trim() && 'opacity-40',
                )}
              >
                <Send size={13} /> Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
