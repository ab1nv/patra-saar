import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileX2,
  Scale,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import { SiteHeader, SiteFooter } from '@/components/layout/SiteChrome'
import { Reveal } from '@/components/layout/Reveal'
import { ComparisonArena } from '@/components/marketing/ComparisonArena'

export const metadata = {
  title: 'PatraSaar vs. Standard LLMs · Statutory Verification Comparison',
  description:
    'Detailed side-by-side comparison demonstrating why standard LLMs fail at Indian statutory law, and how PatraSaar enforces mathematical citation verification against official bare acts.',
}

const COMPARISON_MATRIX = [
  {
    feature: 'Statutory Grounding Source',
    baseline: 'Parametric memory (pre-training text)',
    genericRag: 'Unchecked chunk embeddings',
    patrasaar: '15 Official Bare Acts (3,630 sections)',
    importance:
      'Ensures only current statutory provisions from the Gazette of India are consulted.',
  },
  {
    feature: 'Retrieval Architecture',
    baseline: 'None (pure generation)',
    genericRag: 'Cosine similarity on text chunks',
    patrasaar: 'Hybrid RRF (Dense 384-d + BM25 Lexical + Exact Pinning)',
    importance: 'Pins exact section numbers with priority 9999 while capturing semantic intent.',
  },
  {
    feature: 'Statutory Quote Integrity',
    baseline: 'Paraphrased (9.4% verbatim in audit)',
    genericRag: 'Partial excerpts with LLM alterations',
    patrasaar: 'Strict Verbatim Enforced (98.7% verbatim in audit)',
    importance:
      'Law is sensitive to exact words. A single substituted term alters criminal liability.',
  },
  {
    feature: 'Deterministic AST Verifier',
    baseline: 'None',
    genericRag: 'None (relies on LLM self-evaluation)',
    patrasaar: 'Independent AST & Substring Verifier',
    importance:
      'Mathematically verifies that cited sections exist and quotes match source text before display.',
  },
  {
    feature: 'Non-Existent Section Defense',
    baseline: 'Hallucinates plausible provisions',
    genericRag: 'Answers with irrelevant retrieved text',
    patrasaar: 'Deterministic Abstention Gate (100% abstained)',
    importance: 'Refuses to answer when asked about non-existent sections like IPC Section 515.',
  },
  {
    feature: 'Clickable Source Inspection',
    baseline: 'No source link available',
    genericRag: 'Links to external URLs or heavy PDFs',
    patrasaar: 'Built-in Gazette Section Drawer with 1-click open',
    importance:
      'Lawyers can instantly read the full provision and statutory explanations in context.',
  },
  {
    feature: 'Repeal & New Code Awareness',
    baseline: 'Frequently mixes IPC and BNS sections',
    genericRag: 'Depends on chunk date metadata',
    patrasaar: 'Distinct Act Namespaces (IPC 1860 vs. BNS 2023)',
    importance: 'Prevents quoting repealed penal sections for current post-July 2024 offences.',
  },
  {
    feature: 'In-Process Local Execution',
    baseline: 'Cloud LLM dependency',
    genericRag: 'External Cloud Vector Database',
    patrasaar: 'Zero Cloud Vector Cost (Pure In-Memory Index)',
    importance:
      'Fast, secure, reproducible retrieval without external database latency or subscription tiers.',
  },
]

const PITFALLS = [
  {
    icon: FileX2,
    title: '1. Paraphrase Drift',
    description:
      'Standard LLMs reword legal phrasing into colloquial English. Changing "shall" to "may", or "dishonestly" to "fraudulently", fundamentally alters procedural obligations and penal ingredients.',
  },
  {
    icon: AlertTriangle,
    title: '2. Repeal Blindness',
    description:
      'General models trained on internet text continually conflate the Indian Penal Code with the Bharatiya Nyaya Sanhita (e.g. assuming BNS s.302 is murder when it is actually snatching).',
  },
  {
    icon: ShieldAlert,
    title: '3. Confident Fabrication',
    description:
      'When asked about an imaginary provision (e.g. Section 515 IPC), standard models will draft 3 believable paragraphs of legal prose complete with fake penalties rather than admitting the section does not exist.',
  },
  {
    icon: Scale,
    title: '4. Untraceable Authority',
    description:
      'Even when a standard LLM gives a seemingly correct answer, counsel cannot verify whether the quote was verbatim or hallucinated without manually opening an offline Bare Act volume.',
  },
]

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative border-b border-border/80 bg-gradient-to-b from-surface/60 via-background to-background py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3.5 py-1 text-xs font-medium text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Deterministic Grounding vs. Parametric Guesswork</span>
              </div>
              <h1 className="mt-5 font-serif text-4xl sm:text-6xl max-w-4xl tracking-tight leading-[1.12]">
                Why standard LLMs are dangerous for legal research.
              </h1>
              <p className="mt-5 max-w-3xl text-base sm:text-xl text-muted leading-relaxed">
                General-purpose AI sounds authoritative even when it hallucinates section numbers,
                conflates repealed laws, and fabricates statutory language. PatraSaar enforces a
                mathematical verification pipeline against official Indian Bare Acts.
              </p>
            </Reveal>

            {/* Quick Metrics Bar */}
            <Reveal delay={80}>
              <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-card border border-border bg-surface p-4 sm:p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    PatraSaar Hallucinations
                  </p>
                  <p className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-verified">
                    0.0%
                  </p>
                  <p className="mt-1 text-xs text-faint">
                    0 fabricated citations across 30 audit runs
                  </p>
                </div>
                <div className="rounded-card border border-border bg-surface p-4 sm:p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    Verbatim Quote Precision
                  </p>
                  <p className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-verified">
                    98.7%
                  </p>
                  <p className="mt-1 text-xs text-faint">vs. 9.4% in standard baseline LLM</p>
                </div>
                <div className="rounded-card border border-border bg-surface p-4 sm:p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    In-Corpus Section Retrieval
                  </p>
                  <p className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-accent">
                    100.0%
                  </p>
                  <p className="mt-1 text-xs text-faint">
                    24/24 correct sections identified via RRF
                  </p>
                </div>
                <div className="rounded-card border border-border bg-surface p-4 sm:p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    Abstention on Fake Traps
                  </p>
                  <p className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-verified">
                    100.0%
                  </p>
                  <p className="mt-1 text-xs text-faint">Refuses non-existent statutory queries</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* INTERACTIVE COMPARISON ARENA */}
        <section className="relative py-16 sm:py-20 bg-surface/30 border-b border-border">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <Reveal>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                    Side-by-Side Proof Arena
                  </p>
                  <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
                    See the difference on real statutory questions.
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-muted max-w-md">
                  Select a scenario below to compare a typical LLM response against PatraSaar&apos;s
                  grounded output. Click any green citation badge to inspect the bare act.
                </p>
              </div>
            </Reveal>

            <div className="mt-8">
              <ComparisonArena />
            </div>
          </div>
        </section>

        {/* 4 CRITICAL FAILURE MODES */}
        <section className="relative py-16 sm:py-20 border-b border-border bg-background">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <Reveal>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-danger">
                The Core Vulnerability
              </p>
              <h2 className="mt-2 font-serif text-3xl sm:text-4xl max-w-3xl">
                The four ways unverified LLMs compromise legal accuracy.
              </h2>
              <p className="mt-3 text-muted max-w-2xl text-sm sm:text-base">
                In engineering, an approximation is often acceptable. In statutory interpretation, a
                single misquoted adjective can lead to an improper charge-sheet or dismissed
                petition.
              </p>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
              {PITFALLS.map((p, idx) => {
                const Icon = p.icon
                return (
                  <div
                    key={idx}
                    className="rounded-card border border-border bg-surface p-6 shadow-soft flex items-start gap-4"
                  >
                    <div className="rounded-control bg-danger-soft p-2.5 text-danger shrink-0 mt-0.5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-medium text-foreground">{p.title}</h3>
                      <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* FULL COMPARISON TABLE */}
        <section className="relative py-16 sm:py-24 bg-surface/20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <Reveal>
              <div className="text-center max-w-3xl mx-auto">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                  Architectural Matrix
                </p>
                <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
                  Standard LLM vs. Generic Legal RAG vs. PatraSaar
                </h2>
                <p className="mt-3 text-sm text-muted">
                  How PatraSaar replaces probabilistic guesses with deterministic guarantees.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 overflow-x-auto rounded-card border border-border bg-surface shadow-lift">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-xs uppercase tracking-wider text-muted">
                    <th className="py-4 px-5 font-semibold">Capability</th>
                    <th className="py-4 px-5 font-semibold text-danger">Standard LLM</th>
                    <th className="py-4 px-5 font-semibold text-warning">Generic Legal RAG</th>
                    <th className="py-4 px-5 font-semibold text-verified bg-verified-soft/30">
                      PatraSaar Grounded
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs sm:text-sm">
                  {COMPARISON_MATRIX.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-4 px-5 font-medium text-foreground">
                        <div>{row.feature}</div>
                        <div className="text-[11px] text-faint font-normal mt-0.5">
                          {row.importance}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-muted">
                        <div className="flex items-center gap-1.5 text-danger">
                          <X className="h-4 w-4 shrink-0" />
                          <span>{row.baseline}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-muted">
                        <div className="flex items-center gap-1.5 text-warning">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>{row.genericRag}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-medium text-foreground bg-verified-soft/10">
                        <div className="flex items-center gap-1.5 text-verified">
                          <Check className="h-4 w-4 shrink-0" />
                          <span>{row.patrasaar}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="relative py-16 border-t border-border bg-gradient-to-t from-surface to-background">
          <div className="mx-auto max-w-4xl px-5 text-center sm:px-6">
            <Reveal>
              <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight">
                Experience verified statutory precision.
              </h2>
              <p className="mt-4 text-base text-muted max-w-xl mx-auto">
                Ask any question across our 15 indexed Bare Acts. See every citation verified before
                your eyes.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/chat"
                  className="rounded-control bg-accent px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[.98] inline-flex items-center gap-2 shadow-soft"
                >
                  <span>Open Legal Chat Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/"
                  className="rounded-control border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground transition-all hover:border-border-strong hover:bg-surface-2"
                >
                  Explore 15 Indexed Acts
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
