import Link from 'next/link'
import {
  Ban,
  Bell,
  Clock,
  Cpu,
  FileCheck2,
  FlaskConical,
  Gavel,
  Globe2,
  Landmark,
  Layers,
  Library,
  Link2,
  Lock,
  MapPin,
  PenLine,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { corpusMeta } from '@/lib/corpus'
import { SiteFooter, SiteHeader } from '@/components/layout/SiteChrome'
import { Reveal } from '@/components/layout/Reveal'
import { AuditSection } from '@/components/marketing/AuditSection'
import { SectionLink } from '@/components/marketing/SectionLink'
import auditData from '../../../data/audit-results.json'

export const metadata = {
  title: 'PatraSaar',
}

const PILLARS = [
  {
    icon: Landmark,
    toneText: 'text-accent',
    toneChip: 'border-accent/30 bg-accent-soft',
    title: 'The judgment layer',
    summary:
      'Statutory text is half the law; judicial interpretation is the other. Case law comes next, with the same verify-before-trust discipline.',
    points: [
      {
        icon: Library,
        label: 'Precedent graph.',
        body: 'Index Supreme Court and High Court judgments from open sources such as OpenNyAI and Indian Kanoon.',
      },
      {
        icon: FileCheck2,
        label: 'Paragraph-level verification.',
        body: 'Quotes checked verbatim against the published order, so no invented language attributed to a real case.',
      },
      {
        icon: Gavel,
        label: 'Good-law checks.',
        body: 'Flag judgments overruled by a larger bench, so dead precedent is never cited.',
      },
    ],
  },
  {
    icon: Cpu,
    toneText: 'text-info',
    toneChip: 'border-info/30 bg-info-soft',
    title: 'Multi-model benchmarking',
    summary:
      'The audit proved the verifier on one open-weight model. Next, decouple the generator and widen the measurement.',
    points: [
      {
        icon: Sparkles,
        label: 'Frontier routing.',
        body: 'Send complex reasoning to frontier models, always through the deterministic verifier.',
      },
      {
        icon: Scale,
        label: 'Indian legal models.',
        body: 'Evaluate domain-tuned models such as OpenNyAI Aalap alongside general ones.',
      },
      {
        icon: FlaskConical,
        label: 'Continuous audit.',
        body: 'Grow the 30-question audit past 1,000 questions and re-score every new model that ships.',
      },
    ],
  },
  {
    icon: Layers,
    toneText: 'text-verified',
    toneChip: 'border-verified/30 bg-verified-soft',
    title: 'The complete corpus',
    summary:
      'Indian law is fragmented. Expanding beyond the core codes for corporate and specialised practice.',
    points: [
      {
        icon: MapPin,
        label: 'Jurisdiction-aware retrieval.',
        body: 'Apply state amendments correctly, for example BNSS in Maharashtra versus Delhi.',
      },
      {
        icon: Bell,
        label: 'Delegated legislation.',
        body: 'SEBI circulars, MCA notifications and GST council updates, indexed as they change.',
      },
      {
        icon: Clock,
        label: 'Procedural timelines.',
        body: 'Limitation periods, bail timelines and filing deadlines, extracted and verified.',
      },
    ],
  },
  {
    icon: Users,
    toneText: 'text-warning',
    toneChip: 'border-warning/30 bg-warning-soft',
    title: 'Two audiences, one source of truth',
    summary:
      'Bridge the gap between legal code and the people it governs, without dumbing it down for professionals.',
    points: [
      {
        icon: Globe2,
        label: 'Vernacular access.',
        body: 'Ask in Hindi or Marathi; retrieve and verify in English, answer in the user’s language.',
      },
      {
        icon: PenLine,
        label: 'Plain-language mode.',
        body: 'Turn clauses into actionable steps, with the verified citation drawer kept intact.',
      },
      {
        icon: Link2,
        label: 'Advocate tools.',
        body: 'Verified drafting and precedent chaining across decades of interpretation.',
      },
    ],
  },
]

export default function LandingPage() {
  const meta = corpusMeta()
  const sections = meta.sectionCount.toLocaleString()
  const acts = meta.acts.length
  const auditModel = (auditData as { model: string }).model

  return (
    <div className="relative z-10">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-accent-soft),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
              <ShieldCheck size={12} /> Every citation checked against the bare act
            </p>
            <h1 className="mt-6 font-serif text-[2.6rem] font-semibold leading-[1.04] sm:text-6xl">
              It cites the law,
              <br />
              or it says it doesn&apos;t know.
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted sm:text-lg">
              PatraSaar answers questions about Indian central acts using only an indexed corpus of
              statutory text. Every citation is verified verbatim against the source section before
              you see it - and if nothing relevant is found, it refuses instead of guessing.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/chat"
                className="rounded-control bg-accent px-6 py-3 font-semibold text-background transition-all hover:bg-accent-strong active:scale-[.98]"
              >
                Try the demo
              </Link>
              <SectionLink
                targetId="audit"
                className="rounded-control border border-border bg-surface px-6 py-3 font-semibold transition-all hover:border-border-strong active:scale-[.98]"
              >
                See Benchmarks
              </SectionLink>
            </div>
            <p className="mt-8 text-sm text-faint">
              <span className="text-muted">{sections}</span> sections across{' '}
              <span className="text-muted">{acts}</span> central acts and the Constitution.
              Benchmarked on <span className="font-mono text-muted">{auditModel}</span>.
            </p>
          </div>

          {/* Product mock */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <div className="rounded-card border border-border bg-surface p-4 shadow-lift sm:p-5">
              <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
                <Scale size={15} className="text-accent" />
                <span className="text-xs text-faint">Legal inquiry</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-tr-sm border border-border bg-surface-2 px-3.5 py-2.5 text-sm">
                    What is the punishment for murder under the BNS?
                  </p>
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border bg-background px-4 py-3.5">
                  <div className="mb-2.5 flex gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-verified/30 bg-verified-soft px-2.5 py-0.5 text-[11px] text-verified">
                      ✓ 1 verified
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">
                    Murder is punishable under the Bharatiya Nyaya Sanhita. The provision reads:
                    “Whoever commits murder shall be punished with death or imprisonment for life…”{' '}
                    <span className="rounded border border-verified/40 bg-verified-soft px-1 text-[10px] text-verified">
                      1
                    </span>
                  </p>
                  <div className="mt-3 rounded-lg border border-verified/25 bg-verified-soft/40 px-3 py-2">
                    <p className="text-[11px] font-medium text-verified">
                      ✓ Bharatiya Nyaya Sanhita, 2023 · Section 103
                    </p>
                    <p className="mt-1 font-serif text-xs leading-relaxed text-muted">
                      “Whoever commits murder shall be punished with death or imprisonment for
                      life…”
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verification demo */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-6">
          <Reveal>
            <h2 className="font-serif text-3xl">What verification looks like</h2>
            <div className="mt-6 rounded-card border border-border bg-surface p-6 shadow-soft">
              <div className="mb-4 flex gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-verified/30 bg-verified-soft px-2.5 py-0.5 text-[11px] text-verified">
                  ✓ 1 verified
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-0.5 text-[11px] text-warning">
                  ⚠ 1 unverified
                </span>
              </div>
              <p className="text-sm text-muted">
                Murder is punishable under the Bharatiya Nyaya Sanhita. The provision reads:
                “Whoever commits murder shall be punished with death or imprisonment for life…”{' '}
                <span className="rounded border border-verified/40 bg-verified-soft px-1 text-[10px] text-verified">
                  1
                </span>
              </p>
              <div className="mt-4 space-y-2">
                <div className="rounded-lg border border-verified/25 bg-verified-soft/40 px-3 py-2 text-xs">
                  <span className="text-verified">✓ BNS · Section 103 - Punishment for murder</span>
                  <p className="mt-1 font-serif text-muted">
                    “Whoever commits murder shall be punished with death or imprisonment for life…”
                  </p>
                </div>
                <div className="rounded-lg border border-warning/25 bg-warning-soft/40 px-3 py-2 text-xs">
                  <span className="text-warning">⚠ IPC · Section 302 - quote_not_verbatim</span>
                  <p className="mt-1 font-serif text-muted line-through decoration-warning/50">
                    “Murder carries the death penalty in all cases.”
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-faint">
                The second citation is real law, but the quote was paraphrased - so it is struck
                through and flagged rather than presented as verified.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Audit (moved in from its own page) */}
      <AuditSection />

      {/* Comparison */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <h2 className="max-w-3xl font-serif text-3xl sm:text-4xl">
            Narrow on purpose. Here is the tradeoff.
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted">
            PatraSaar&apos;s audit above was measured on{' '}
            <span className="font-mono text-foreground">{auditModel}</span>. The comparison below is
            about product design, not benchmarks against other tools.
          </p>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wider text-faint">
                <tr>
                  <th className="px-5 py-3"> </th>
                  <th className="px-5 py-3 text-accent">PatraSaar</th>
                  <th className="px-5 py-3">General-purpose assistants</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    'Answer source',
                    'Only the indexed bare acts',
                    'Broad training data + optional web',
                  ],
                  [
                    'Citation verification',
                    'Every citation checked verbatim against source text',
                    'Not a built-in guarantee',
                  ],
                  ['When it lacks the provision', 'Refuses and says so', 'Typically still answers'],
                  ['Source text inline', 'Yes, verbatim from the act', 'Varies'],
                  ['Scope', 'Deliberately narrow and published', 'General purpose'],
                  [
                    'Benchmark model',
                    `${auditModel} (Groq)`,
                    'Varies; no Indian-statute rate published',
                  ],
                ].map(([label, a, b]) => (
                  <tr key={label} className="border-t border-border">
                    <td className="px-5 py-3 text-faint">{label}</td>
                    <td className="px-5 py-3 text-foreground">{a}</td>
                    <td className="px-5 py-3 text-muted">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      {/* Corpus */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
          <Reveal>
            <div className="flex items-center gap-2">
              <Library size={16} className="text-accent" />
              <h2 className="font-serif text-3xl">What is indexed</h2>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              {sections} sections parsed directly from the source PDFs, with the exact build date
              and per-act counts published on the audit page.
            </p>
          </Reveal>
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {meta.acts.map((a, i) => (
              <Reveal key={a.act} delay={Math.min(i, 5) * 50}>
                <div className="flex items-center justify-between rounded-control border border-border bg-surface px-4 py-3">
                  <span className="text-sm">{a.actFull}</span>
                  <span className="font-mono text-xs text-faint">{a.sectionCount}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities + privacy */}
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <div>
            <h2 className="font-serif text-2xl">Why it can be trusted</h2>
            <div className="mt-6 space-y-5">
              {[
                {
                  icon: ShieldCheck,
                  title: 'Deterministic verifier',
                  body: 'Normalized string-matching against indexed text - not a second model that could itself hallucinate.',
                },
                {
                  icon: Ban,
                  title: 'Abstains when unsure',
                  body: 'Retrieval below threshold means no answer at all, rather than a confident guess.',
                },
                {
                  icon: FlaskConical,
                  title: 'Measured, not asserted',
                  body: 'The same model, with and without verification, scored on a published question set.',
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-3">
                  <Icon size={18} className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    <h3 className="font-serif text-base">{title}</h3>
                    <p className="mt-1 text-sm text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="rounded-card border border-border bg-surface p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-accent" />
              <h2 className="font-serif text-xl">Privacy, stated plainly</h2>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li>
                Your questions and the generated answers are sent to our LLM provider (Groq) for
                inference.
              </li>
              <li>
                Chat history is stored in our database so you can return to it, and you can delete
                any chat at any time.
              </li>
              <li>Incognito mode does not persist the conversation at all.</li>
              <li>We run no analytics or third-party trackers.</li>
            </ul>
            <p className="mt-5 text-xs text-faint">
              We do not claim your data never leaves your device - it is sent to the model provider
              to produce an answer.
            </p>
          </div>
        </Reveal>
      </section>

      {/* What's ahead */}
      <section id="roadmap" className="scroll-mt-20 border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
              What&apos;s ahead
            </p>
            <h2 className="mt-4 max-w-3xl font-serif text-3xl sm:text-4xl">
              The roadmap to verified legal intelligence
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              PatraSaar today eliminates parametric hallucination across a bounded set of Indian
              central acts. The next step is a full legal reasoning engine, built for an era where
              verifiability precedes generation. Four pillars, serving the citizen and the advocate.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {PILLARS.map((pillar, i) => {
              const Icon = pillar.icon
              return (
                <Reveal key={pillar.title} delay={i * 70}>
                  <article className="group h-full rounded-card border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-border-strong">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control border ${pillar.toneChip}`}
                      >
                        <Icon size={18} className={pillar.toneText} />
                      </span>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-faint">
                          Pillar {i + 1}
                        </p>
                        <h3 className="font-serif text-lg">{pillar.title}</h3>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-muted">{pillar.summary}</p>

                    <ul className="mt-4 space-y-2.5">
                      {pillar.points.map((point) => {
                        const PointIcon = point.icon
                        return (
                          <li key={point.label} className="flex gap-2.5 text-xs leading-relaxed">
                            <PointIcon size={13} className={`mt-0.5 shrink-0 ${pillar.toneText}`} />
                            <span className="text-muted">
                              <span className="font-medium text-foreground">{point.label}</span>{' '}
                              {point.body}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </article>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
