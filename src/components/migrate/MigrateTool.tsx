'use client'

import { useState } from 'react'
import { ArrowLeftRight, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Section = {
  id: string
  act: string
  actFull: string
  number: string
  title: string
  text: string
}

type MigrateResponse = {
  direction: 'ipc->bns' | 'bns->ipc'
  inputNumber: string
  inputFound: boolean
  source?: Section
  target?: Section
  verified: boolean
  note?: string
  candidates: { section: Section; score: number }[]
  curatedCount: number
}

export function MigrateTool() {
  const [direction, setDirection] = useState<'ipc->bns' | 'bns->ipc'>('ipc->bns')
  const [number, setNumber] = useState('420')
  const [result, setResult] = useState<MigrateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<Section | null>(null)

  async function run(e?: React.FormEvent) {
    e?.preventDefault()
    if (!number.trim()) return
    setLoading(true)
    setError(null)
    setPicked(null)
    try {
      const param = direction === 'ipc->bns' ? 'ipc' : 'bns'
      const res = await fetch(`/api/migrate?${param}=${encodeURIComponent(number.trim())}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(data.message ?? 'Lookup failed')
      }
      setResult((await res.json()) as MigrateResponse)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function flip() {
    setDirection((d) => (d === 'ipc->bns' ? 'bns->ipc' : 'ipc->bns'))
    setResult(null)
    setPicked(null)
  }

  const targetSection = picked ?? result?.target

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
        IPC ↔ BNS migration mapper
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold">
        &ldquo;My FIR says IPC {result?.inputNumber ?? number} — what is it now?&rdquo;
      </h1>
      <p className="mt-4 max-w-2xl text-muted">
        India replaced the Indian Penal Code, 1860 with the Bharatiya Nyaya Sanhita, 2023. This tool
        shows the corresponding BNS section for {result?.curatedCount ?? 0} hand-checked IPC
        sections, and falls back to a text-similarity suggestion for the rest. Both texts are shown
        verbatim so you can judge the mapping yourself.
      </p>

      <form onSubmit={run} className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1">
          <span className="px-2 text-xs font-medium text-muted">
            {direction === 'ipc->bns' ? 'IPC' : 'BNS'}
          </span>
          <button
            type="button"
            onClick={flip}
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            aria-label="Swap direction"
          >
            <ArrowLeftRight size={14} />
          </button>
          <span className="px-2 text-xs font-medium text-muted">
            {direction === 'ipc->bns' ? 'BNS' : 'IPC'}
          </span>
        </div>
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Section number, e.g. 420"
          className="max-w-[180px]"
        />
        <Button type="submit" disabled={loading}>
          <Search size={14} /> {loading ? 'Looking up…' : 'Map section'}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {result && !result.inputFound && (
        <p className="mt-6 text-sm text-warning">
          Section {result.inputNumber} was not found in the indexed{' '}
          {direction === 'ipc->bns' ? 'IPC' : 'BNS'}.
        </p>
      )}

      {result && result.inputFound && (
        <>
          <div className="mt-6 flex items-center gap-3">
            {result.verified ? (
              <Badge tone="verified">✓ Verified mapping</Badge>
            ) : (
              <Badge tone="warning">⚠ Suggested — verify yourself</Badge>
            )}
            {result.note && <span className="text-xs text-faint">{result.note}</span>}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SectionPanel
              label={`${result.source?.act} ${result.source?.number}`}
              section={result.source}
            />
            <SectionPanel
              label={targetSection ? `${targetSection.act} ${targetSection.number}` : 'No match'}
              section={targetSection}
              muted={!result.verified}
            />
          </div>

          {!result.verified && result.candidates.length > 0 && (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-wider text-faint">
                Closest BNS sections by text similarity — not verified
              </p>
              <div className="mt-2 space-y-2">
                {result.candidates.map((c) => (
                  <button
                    key={c.section.id}
                    type="button"
                    onClick={() => setPicked(c.section)}
                    className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-left hover:border-border-strong"
                  >
                    <span className="text-sm font-medium">
                      BNS {c.section.number} — {c.section.title}
                    </span>
                    <span className="ml-2 text-xs text-faint">score {c.score.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SectionPanel({
  label,
  section,
  muted,
}: {
  label: string
  section?: Section
  muted?: boolean
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Badge tone={muted ? 'warning' : 'accent'}>{label}</Badge>
      </div>
      {section ? (
        <>
          <h3 className="font-serif text-lg">{section.title}</h3>
          <p className="statute mt-3 whitespace-pre-wrap text-muted">{section.text}</p>
        </>
      ) : (
        <p className="text-sm text-faint">No section to show.</p>
      )}
    </div>
  )
}
