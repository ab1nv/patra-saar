import type { Metadata } from 'next'
import audit from '../../../data/audit-results.json'
import { SiteFooter, SiteHeader } from '@/components/layout/SiteChrome'
import { Reveal } from '@/components/layout/Reveal'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'PatraSaar - Hallucination audit',
  description:
    'A self-run comparison of the same model answering Indian statute questions with and without retrieval-plus-verification.',
}

type Citation = {
  actName: string
  number: string
  quote: string
  resolvedId?: string
  exists: boolean
  verbatim: boolean
  correct: boolean
  verified?: boolean
}
type Arm = {
  answer: string
  abstained: boolean
  citationCount: number
  fabricatedCount: number
  verifiedCount: number
  citations: Citation[]
  providerAbstained?: boolean
}
type Result = {
  id: string
  kind: 'in-corpus' | 'nonexistent' | 'out-of-corpus'
  question: string
  expectedSection?: string
  baseline: Arm
  grounded: Arm
}
type ArmSummary = {
  citations: number
  existsCount: number
  verbatimCount: number
  correctCount: number
  fabricatedCount: number
  verifiedCount: number
  existsRate: number
  verbatimRate: number
  correctRate: number
  fabricatedRate: number
  verifiedRate: number
  abstainRate: number
  questionAccuracy: number
  correctQuestions: number
  inCorpusQuestions: number
  questionsWithFabrication: number
  fabricatedQuestionRate: number
}
type Audit = {
  runAt: string
  model: string
  provider: string
  sampleSize: number
  summary: { sampleSize: number; inCorpus: number; baseline: ArmSummary; grounded: ArmSummary }
  results: Result[]
}

const data = audit as unknown as Audit
const s = data.summary

function pct(n: number): string {
  return `${Math.round(n * 1000) / 10}%`
}

export default function AuditPage() {
  const fabricatedBaseline = data.results.filter((r) => r.baseline.fabricatedCount > 0)
  const examples = (
    fabricatedBaseline.length > 0
      ? fabricatedBaseline
      : data.results.filter((r) => r.kind !== 'in-corpus')
  ).slice(0, 3)

  return (
    <div className="relative z-10">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        <section className="pt-14 sm:pt-20">
          <Reveal>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
              Hallucination audit
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
              We pointed the same model at the same questions, with and without verification.
            </h1>
            <p className="mt-5 max-w-3xl text-base text-muted sm:text-lg">
              Every Indian legal-AI product claims to cite the law. Rather than assert it, we
              measured it: {data.sampleSize} questions, two arms - a language model answering from
              memory (the “just ask a chatbot” baseline) and PatraSaar&apos;s retrieve → constrain →
              verify pipeline - scored deterministically against the indexed bare acts.
            </p>
            <p className="mt-4 max-w-3xl rounded-card border border-accent/25 bg-accent-soft p-4 text-sm text-muted">
              <strong className="text-foreground">Headline.</strong> The ungrounded model usually
              names a <em>real</em> section - but its quoted wording is almost always not the actual
              statute: only <strong className="text-danger">{pct(s.baseline.verbatimRate)}</strong>{' '}
              of its quotes appear verbatim in the source text, versus{' '}
              <strong className="text-verified">{pct(s.grounded.verbatimRate)}</strong> for
              PatraSaar. PatraSaar verifies {pct(s.grounded.verifiedRate)} of the citations it shows
              and fabricates none.
            </p>
          </Reveal>
        </section>

        {/* Headline stats */}
        <Reveal delay={80}>
          <section className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Baseline quotes that are verbatim"
              value={pct(s.baseline.verbatimRate)}
              tone="danger"
              detail={`${s.baseline.verbatimCount} of ${s.baseline.citations} citations`}
            />
            <Stat
              label="Baseline correct section"
              value={pct(s.baseline.questionAccuracy)}
              tone="warning"
              detail={`${s.baseline.correctQuestions} of ${s.baseline.inCorpusQuestions} questions`}
            />
            <Stat
              label="PatraSaar verified citations"
              value={pct(s.grounded.verifiedRate)}
              tone="verified"
              detail={`${s.grounded.verifiedCount} of ${s.grounded.citations} citations`}
            />
            <Stat
              label="PatraSaar fabricated citations"
              value={pct(s.grounded.fabricatedRate)}
              tone="verified"
              detail={`${s.grounded.fabricatedCount} of ${s.grounded.citations} citations`}
            />
          </section>
        </Reveal>

        {/* Bar comparison */}
        <Reveal delay={120}>
          <section className="mt-12 rounded-card border border-border bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="font-serif text-2xl">Citation quality by arm</h2>
            <p className="mt-1 text-sm text-muted">
              Share of citations in each arm. The verifier is deterministic string-matching against
              the indexed text - it is not a second language model.
            </p>
            <div className="mt-7 grid gap-8 md:grid-cols-2">
              <ArmBars
                title="Baseline - model from memory"
                rows={[
                  { label: 'Resolves to a real section', value: s.baseline.existsRate },
                  { label: 'Quote is verbatim', value: s.baseline.verbatimRate },
                  { label: 'Matches the right section', value: s.baseline.correctRate },
                  {
                    label: 'Fabricated (section does not exist)',
                    value: s.baseline.fabricatedRate,
                    danger: true,
                  },
                ]}
              />
              <ArmBars
                title="PatraSaar - retrieve + verify"
                rows={[
                  { label: 'Resolves to a real section', value: s.grounded.existsRate },
                  { label: 'Quote is verbatim', value: s.grounded.verbatimRate },
                  { label: 'Matches the right section', value: s.grounded.correctRate },
                  {
                    label: 'Verified (exists + retrieved + verbatim)',
                    value: s.grounded.verifiedRate,
                    verified: true,
                  },
                  {
                    label: 'Fabricated (section does not exist)',
                    value: s.grounded.fabricatedRate,
                    danger: true,
                  },
                ]}
              />
            </div>
          </section>
        </Reveal>

        {/* Examples */}
        {examples.length > 0 && (
          <Reveal delay={160}>
            <section className="mt-12">
              <h2 className="font-serif text-2xl">Side by side</h2>
              <p className="mt-1 text-sm text-muted">
                The failure mode PatraSaar exists to catch: a confident citation that does not
                survive a check against the source text.
              </p>
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {examples.map((r) => (
                  <div key={r.id} className="rounded-card border border-border bg-surface p-5">
                    <p className="text-sm font-medium">{r.question}</p>
                    <div className="mt-4 space-y-3">
                      <ArmExample label="Baseline" arm={r.baseline} tone="danger" />
                      <ArmExample label="PatraSaar" arm={r.grounded} tone="verified" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Full table */}
        <Reveal delay={200}>
          <section className="mt-12">
            <h2 className="font-serif text-2xl">All questions</h2>
            <div className="mt-4 overflow-x-auto rounded-card border border-border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wider text-faint">
                  <tr>
                    <th className="px-4 py-3">Question</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Baseline</th>
                    <th className="px-4 py-3">PatraSaar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((r) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="max-w-sm px-4 py-3">{r.question}</td>
                      <td className="px-4 py-3 text-xs text-faint">{r.kind}</td>
                      <td className="px-4 py-3 text-xs">
                        <ArmCell arm={r.baseline} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <ArmCell arm={r.grounded} expected={r.expectedSection} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>

        {/* Methodology */}
        <Reveal delay={240}>
          <section className="mt-14 rounded-card border border-border bg-surface p-6 sm:p-8">
            <h2 className="font-serif text-2xl">Methodology, stated honestly</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
              <p>
                <strong className="text-foreground">Sample.</strong> {data.sampleSize} questions:{' '}
                {s.inCorpus} in-corpus (each with a ground-truth section verified to exist), 3
                naming a section that does not exist, and 3 outside the indexed acts.
              </p>
              <p>
                <strong className="text-foreground">Arms.</strong> The baseline is the same model
                answering from parametric memory with no retrieved context. It is not ChatGPT
                itself. PatraSaar is the same model constrained to the retrieved sections and then
                checked server-side.
              </p>
              <p>
                <strong className="text-foreground">Scoring.</strong> Deterministic and
                reproducible: a citation <em>exists</em> if it resolves in the corpus, is
                <em> verbatim</em> if the quoted string appears in the section after normalization,
                and is <em>correct</em> if it matches the ground-truth section. A citation that
                resolves to no real section is counted as fabricated. The verifier is normalized
                string-matching, not another model, so it cannot itself hallucinate about whether
                something was hallucinated.
              </p>
              <p>
                <strong className="text-foreground">Limitations.</strong> This is a small, self-run,
                single-model, non-adversarial benchmark - not a peer-reviewed study. It measures
                citation provenance, not legal reasoning: a correctly quoted section can still be
                applied to the wrong situation. It mirrors, at a much smaller scale, the design of
                the Stanford RegLab audits of commercial legal-AI tools.
              </p>
              <p className="text-xs text-faint">
                Model: {data.model}. Run at{' '}
                {new Date(data.runAt).toISOString().slice(0, 16).replace('T', ' ')} UTC. Re-run with{' '}
                <code className="text-muted">pnpm audit:run</code>.
              </p>
            </div>
          </section>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  )
}

function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone: 'verified' | 'warning' | 'danger'
}) {
  const color =
    tone === 'verified' ? 'text-verified' : tone === 'danger' ? 'text-danger' : 'text-warning'
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-soft transition-transform duration-300 hover:-translate-y-0.5">
      <p className={`font-serif text-3xl ${color}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] text-faint">{detail}</p>
    </div>
  )
}

function ArmBars({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: number; danger?: boolean; verified?: boolean }[]
}) {
  return (
    <div>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-faint">{title}</p>
      <div className="space-y-3.5">
        {rows.map((r) => {
          const color = r.danger ? 'bg-danger' : r.verified ? 'bg-verified' : 'bg-accent'
          return (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted">{r.label}</span>
                <span className="tabular-nums text-foreground">{pct(r.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full ${color} transition-[width] duration-700 ease-out`}
                  style={{ width: `${Math.max(1.5, r.value * 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ArmExample({
  label,
  arm,
  tone,
}: {
  label: string
  arm: Arm
  tone: 'danger' | 'verified'
}) {
  return (
    <div
      className={`rounded-control border p-3 ${
        tone === 'danger'
          ? 'border-danger/25 bg-danger-soft/30'
          : 'border-verified/25 bg-verified-soft/30'
      }`}
    >
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-faint">{label}</p>
      {arm.abstained ? (
        <p className="text-xs text-muted">Refused - no citation produced.</p>
      ) : (
        <ul className="space-y-1.5">
          {arm.citations.slice(0, 2).map((c, i) => (
            <li key={i} className="text-xs">
              <span className={c.exists ? 'text-foreground' : 'text-danger'}>
                {c.exists ? '✓' : '⚠'} {c.actName} s.{c.number}
              </span>
              <span className="block text-[11px] text-faint">
                {c.exists
                  ? c.verbatim
                    ? 'verbatim match'
                    : 'quote not found'
                  : 'section does not exist'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ArmCell({ arm, expected }: { arm: Arm; expected?: string }) {
  if (arm.abstained) return <span className="text-faint">refused</span>
  const fabricated = arm.citations.filter((c) => !c.exists).length
  const correct = expected ? arm.citations.some((c) => c.correct) : null
  return (
    <span className="flex flex-wrap gap-1.5">
      {fabricated > 0 && <Badge tone="danger">{fabricated} fabricated</Badge>}
      {correct === true && <Badge tone="verified">correct</Badge>}
      {correct === false && <Badge tone="warning">wrong section</Badge>}
      {fabricated === 0 && correct === null && <Badge tone="neutral">no fabrication</Badge>}
    </span>
  )
}
