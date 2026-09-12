import audit from '../../../data/audit-results.json'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/layout/Reveal'
import { AnimatedBars } from './AnimatedBars'

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

export function AuditSection() {
  const wrongSection = data.results.filter(
    (r) =>
      r.expectedSection && !r.baseline.abstained && !r.baseline.citations.some((c) => c.correct),
  )
  const mismatch = data.results.filter((r) =>
    r.baseline.citations.some((c) => c.exists && !c.verbatim),
  )
  const examples = [...wrongSection, ...mismatch]
    .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
    .slice(0, 3)

  const baselineAnsweredUnanswerable = data.results.filter(
    (r) => r.kind !== 'in-corpus' && !r.baseline.abstained,
  ).length
  const patrasaarAbstainedUnanswerable = data.results.filter(
    (r) => r.kind !== 'in-corpus' && r.grounded.abstained,
  ).length
  const unanswerable = data.results.filter((r) => r.kind !== 'in-corpus').length

  return (
    <section id="audit" className="relative scroll-mt-20 border-y border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            Hallucination audit
          </p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
            We pointed the same model at the same questions, with and without verification.
          </h2>
          <p className="mt-5 max-w-3xl text-base text-muted sm:text-lg">
            Every Indian legal-AI product claims to cite the law. Instead of asserting it, we
            measured it: {data.sampleSize} questions, two arms, scored deterministically against the
            indexed bare acts. Both arms use the same model,{' '}
            <span className="font-mono text-foreground">{data.model}</span>, so the difference is
            retrieval and verification, not the model.
          </p>
        </Reveal>

        {/* Hero metrics */}
        <Reveal delay={60}>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="animate-fade-up rounded-card border border-danger/30 bg-danger-soft/40 p-6 sm:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-danger">
                Baseline - model from memory
              </p>
              <p className="mt-3 font-serif text-6xl font-semibold leading-none text-danger sm:text-7xl">
                {pct(s.baseline.verbatimRate)}
              </p>
              <p className="mt-3 text-sm text-muted">
                of quotes are actually the statute ({s.baseline.verbatimCount} of{' '}
                {s.baseline.citations} citations). Its section numbers are usually{' '}
                <span className="text-foreground">real</span>, but the wording is not.
              </p>
            </div>
            <div className="animate-fade-up rounded-card border border-verified/40 bg-verified-soft/50 p-6 [animation-delay:90ms] sm:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-verified">
                PatraSaar - retrieve + verify
              </p>
              <p className="mt-3 font-serif text-6xl font-semibold leading-none text-verified sm:text-7xl">
                {pct(s.grounded.verifiedRate)}
              </p>
              <p className="mt-3 text-sm text-muted">
                of shown citations are verified verbatim against the source (
                {s.grounded.verifiedCount} of {s.grounded.citations}), and{' '}
                <span className="text-foreground">{pct(s.grounded.fabricatedRate)} fabricated</span>
                .
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MiniStat
              label="Baseline correct section"
              value={pct(s.baseline.questionAccuracy)}
              detail={`${s.baseline.correctQuestions} of ${s.baseline.inCorpusQuestions} questions`}
              tone="warning"
            />
            <MiniStat
              label="PatraSaar correct section"
              value={pct(s.grounded.questionAccuracy)}
              detail={`${s.grounded.correctQuestions} of ${s.grounded.inCorpusQuestions} questions`}
              tone="verified"
            />
            <MiniStat
              label="Unanswerable questions answered anyway"
              value={`${baselineAnsweredUnanswerable} vs ${unanswerable - patrasaarAbstainedUnanswerable}`}
              detail={`baseline vs PatraSaar (of ${unanswerable}); PatraSaar abstained on ${patrasaarAbstainedUnanswerable}`}
              tone="danger"
            />
          </div>
        </Reveal>

        {/* How it is calculated */}
        <Reveal delay={120}>
          <div className="mt-12 rounded-card border border-border bg-surface p-6 shadow-soft sm:p-8">
            <h3 className="font-serif text-2xl">How we calculate this</h3>
            <p className="mt-1 text-sm text-muted">
              Both arms are scored by the same deterministic code that runs in production. No
              language model is used to judge either arm.
            </p>
            <ol className="mt-6 grid gap-5 md:grid-cols-4">
              {[
                {
                  n: '01',
                  title: 'Ask',
                  body: '30 ground-truth questions: 24 in-corpus with a verified answer key, 3 naming a section that does not exist, 3 outside the corpus.',
                },
                {
                  n: '02',
                  title: 'Answer twice',
                  body: 'The same model answers each question once from memory and once with retrieved sections. Only the context differs.',
                },
                {
                  n: '03',
                  title: 'Retrieve',
                  body: 'In-process BM25 over 3,268 parsed sections, plus exact-section pins, a named-act boost, a title phrase boost and a coverage gate.',
                },
                {
                  n: '04',
                  title: 'Verify and score',
                  body: 'Three deterministic checks per citation: does the section exist, was it retrieved, and is the quote verbatim. Those become the rates below.',
                },
              ].map((step) => (
                <li key={step.n} className="border-t-2 border-accent/40 pt-4">
                  <span className="font-mono text-xs text-accent">{step.n}</span>
                  <h4 className="mt-2 font-serif text-base">{step.title}</h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-xs leading-relaxed text-faint">
              Technology: Next.js route handlers, an in-process BM25 index over the parsed corpus, a
              deterministic normalized string-matching verifier, and {data.model} on Groq for
              generation. The same verifier functions gate the live chat, so this benchmark measures
              the shipped system rather than a separate harness.
            </p>
          </div>
        </Reveal>

        {/* Bars */}
        <Reveal delay={140}>
          <div className="mt-12 rounded-card border border-border bg-surface p-6 shadow-soft sm:p-8">
            <h3 className="font-serif text-2xl">Citation quality by arm</h3>
            <p className="mt-1 text-sm text-muted">
              Share of citations in each arm. The verifier is deterministic string-matching against
              the indexed text - it is not a second language model.
            </p>
            <div className="mt-7 grid gap-8 md:grid-cols-2">
              <div>
                <p className="mb-4 text-xs font-medium uppercase tracking-wider text-faint">
                  Baseline - model from memory
                </p>
                <AnimatedBars
                  rows={[
                    { label: 'Resolves to a real section', value: s.baseline.existsRate },
                    { label: 'Quote is verbatim', value: s.baseline.verbatimRate, danger: true },
                    { label: 'Matches the right section', value: s.baseline.correctRate },
                    {
                      label: 'Fabricated (section does not exist)',
                      value: s.baseline.fabricatedRate,
                      danger: true,
                    },
                  ]}
                />
              </div>
              <div>
                <p className="mb-4 text-xs font-medium uppercase tracking-wider text-faint">
                  PatraSaar - retrieve + verify
                </p>
                <AnimatedBars
                  rows={[
                    { label: 'Resolves to a real section', value: s.grounded.existsRate },
                    { label: 'Quote is verbatim', value: s.grounded.verbatimRate, verified: true },
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
            </div>
          </div>
        </Reveal>

        {/* Side by side */}
        {examples.length > 0 && (
          <Reveal delay={160}>
            <div className="mt-12">
              <h3 className="font-serif text-2xl">Side by side</h3>
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
            </div>
          </Reveal>
        )}

        {/* Full table */}
        <Reveal delay={200}>
          <div className="mt-12">
            <h3 className="font-serif text-2xl">Questions asked</h3>
            <p className="mt-1 text-sm text-muted">
              Every question, colour-coded: green is the correct outcome, red is wrong or
              fabricated, amber is a partial or unverifiable answer. For the six unanswerable
              questions, refusing is the correct outcome.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-verified" /> correct / verified
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-warning" /> partial / unverifiable
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-danger" /> wrong / fabricated
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-border-strong" /> refused
              </span>
            </div>
            <div className="mt-6 overflow-x-auto rounded-card border border-border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wider text-faint">
                  <tr>
                    <th className="px-4 py-3">Question</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Baseline ({data.model})</th>
                    <th className="px-4 py-3">PatraSaar (verified)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((r) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="max-w-sm px-4 py-3">{r.question}</td>
                      <td className="px-4 py-3 text-xs text-faint">{r.kind}</td>
                      <td className="px-4 py-3 text-xs">
                        <ArmCell arm={r.baseline} kind={r.kind} expected={r.expectedSection} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <ArmCell arm={r.grounded} kind={r.kind} expected={r.expectedSection} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* Methodology */}
        <Reveal delay={240}>
          <div className="mt-14 rounded-card border border-border bg-surface p-6 sm:p-8">
            <h3 className="font-serif text-2xl">Methodology</h3>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
              <p>
                <strong className="text-foreground">Sample.</strong> {data.sampleSize} questions:{' '}
                {s.inCorpus} in-corpus (each with a ground-truth section verified to exist), 3
                naming a section that does not exist, and 3 outside the indexed acts.
              </p>
              <p>
                <strong className="text-foreground">Model.</strong> Both arms use{' '}
                <span className="font-mono text-foreground">{data.model}</span> (temperature 0.1).
                The baseline is the same model answering from memory with no retrieved context; it
                is not ChatGPT or Claude. PatraSaar is the same model constrained to the retrieved
                sections and then checked server-side.
              </p>
              <p>
                <strong className="text-foreground">Scoring.</strong> Deterministic and
                reproducible: a citation <em>exists</em> if it resolves in the corpus, is{' '}
                <em>verbatim</em> if the quoted string appears in the section after normalization,
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
                Run at {new Date(data.runAt).toISOString().slice(0, 16).replace('T', ' ')} UTC.
                Re-run with <code className="text-muted">pnpm audit:run</code>. Raw data:{' '}
                <code className="text-muted">data/audit-results.json</code>.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function MiniStat({
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
    <div className="rounded-card border border-border bg-surface p-5 transition-transform duration-300 hover:-translate-y-0.5">
      <p className={`font-serif text-3xl ${color}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] text-faint">{detail}</p>
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

function ArmCell({
  arm,
  kind,
  expected,
}: {
  arm: Arm
  kind: 'in-corpus' | 'nonexistent' | 'out-of-corpus'
  expected?: string
}) {
  const unanswerable = kind !== 'in-corpus'

  if (arm.abstained) {
    return unanswerable ? (
      <Badge tone="verified">abstained (correct)</Badge>
    ) : (
      <Badge tone="danger">refused (should answer)</Badge>
    )
  }

  const fabricated = arm.citations.filter((c) => !c.exists).length
  if (fabricated > 0) return <Badge tone="danger">{fabricated} fabricated</Badge>

  if (unanswerable) return <Badge tone="danger">answered anyway</Badge>

  const correct = expected ? arm.citations.some((c) => c.correct) : false
  if (correct) {
    const allVerbatim = arm.citations.every((c) => !c.exists || c.verbatim)
    return allVerbatim ? (
      <Badge tone="verified">correct</Badge>
    ) : (
      <Badge tone="warning">right section, quote not verbatim</Badge>
    )
  }
  return <Badge tone="danger">wrong section</Badge>
}
