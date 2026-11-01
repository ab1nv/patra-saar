import Link from 'next/link'
import {
  ArrowRight,
  Binary,
  CheckCircle2,
  Code2,
  FileCheck2,
  Layers,
  Network,
  XCircle,
} from 'lucide-react'
import { SiteHeader, SiteFooter } from '@/components/layout/SiteChrome'
import { Reveal } from '@/components/layout/Reveal'
import { MethodologyPipeline } from '@/components/marketing/MethodologyPipeline'

export const metadata = {
  title: 'Methodology & Architecture · PatraSaar',
  description:
    'Detailed technical methodology of PatraSaar: In-memory Okapi BM25, 384-d dense embeddings, Reciprocal Rank Fusion (RRF), exact section pinning, and deterministic AST citation verification.',
}

const MATHEMATICAL_PILLARS = [
  {
    icon: Network,
    title: '1. Okapi BM25 with Title-Phrase Boosting',
    badge: 'Lexical Precision',
    formula:
      'Score(D, Q) = \\sum_{i=1}^n IDF(q_i) \\cdot \\frac{f(q_i, D) \\cdot (k_1 + 1)}{f(q_i, D) + k_1 \\cdot (1 - b + b \\cdot \\frac{|D|}{\\text{avgdl}})}',
    description:
      'In statutory law, exact words matter. BM25 scores sections using term saturation (k1 = 1.2) and document length normalization (b = 0.75). PatraSaar adds an aggressive Title-Phrase multiplier: if a multi-word phrase from the query appears contiguously in the marginal title of a section, its BM25 score is multiplied by 1.5x.',
    parameters: ['k1 = 1.2', 'b = 0.75', 'Phrase Boost = 1.5x', 'Single Title Word = 1.3x'],
  },
  {
    icon: Binary,
    title: '2. Contiguous Float32 Dense Vector Space',
    badge: 'Semantic Retrieval',
    formula: '\\text{Sim}(\\vec{q}, \\vec{d}) = \\sum_{k=1}^{384} q_k \\cdot d_k',
    description:
      'Rather than relying on expensive and privacy-compromising external vector cloud databases, all 3,630 sections are pre-computed using Xenova/all-MiniLM-L6-v2 and stored in a single 5.32 MB binary Float32Array. Because each 384-dimensional vector is L2-normalized during corpus compilation, cosine similarity reduces to an ultra-fast raw dot product scanned in < 2ms on CPU.',
    parameters: ['384 Dimensions', '3,630 Sections', '5.32 MB Buffer', '< 2ms CPU Scan'],
  },
  {
    icon: Layers,
    title: '3. Reciprocal Rank Fusion (RRF)',
    badge: 'Rank Aggregation',
    formula: 'RRF(d) = \\sum_{m \\in M} \\frac{1}{k + r_m(d)} \\quad (k = 60)',
    description:
      'BM25 scores and vector dot-products exist on completely different numerical scales. Reciprocal Rank Fusion overcomes score calibration issues by considering only the ordinal rank of each document. With k=60, a section that ranks highly in both lexical and dense lists is exponentially elevated above candidate noise.',
    parameters: ['k = 60', 'Sparse Top 60', 'Dense Top 40', 'Priority Pin = 9999'],
  },
  {
    icon: FileCheck2,
    title: '4. Normalized AST String Verifier',
    badge: 'Deterministic Compiler',
    formula: '\\text{Clean}(S) = S.\\text{lower}().\\text{stripPunct}().\\text{collapseWs}()',
    description:
      'The citation verifier is a pure, non-LLM algorithmic validator. Quotes and bare acts are passed through a rigorous unicode normalization pipeline: smart quotes (\u201C, \u201D) and dashes (\u2014, \u2013) are unified, ligatures are decomposed, punctuation is stripped, and whitespace is collapsed before executing a zero-tolerance substring check.',
    parameters: ['Zero LLM Latency', 'Unicode Normalized', 'Deterministic AST', '0% Fabrication'],
  },
]

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative border-b border-border/80 bg-gradient-to-b from-surface/80 via-background to-background py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3.5 py-1 text-xs font-medium text-accent">
                <Code2 className="h-3.5 w-3.5" />
                <span>Deterministic Legal AI Architecture</span>
              </div>
              <h1 className="mt-5 font-serif text-4xl sm:text-6xl max-w-4xl tracking-tight leading-[1.12]">
                Verification over trust.
              </h1>
              <p className="mt-5 max-w-3xl text-base sm:text-xl text-muted leading-relaxed">
                How PatraSaar eliminates legal hallucinations by combining in-process hybrid
                retrieval, structured grammar constraints, and a zero-LLM deterministic AST
                verifier.
              </p>
            </Reveal>

            {/* High-level Architecture Flow Banner */}
            <Reveal delay={60}>
              <div className="mt-12 rounded-card border border-border bg-surface p-6 sm:p-8 shadow-soft">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                  The End-to-End Pipeline Philosophy
                </p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border-l-2 border-accent pl-4">
                    <p className="font-mono text-xs text-accent">PHASE 1</p>
                    <h3 className="mt-1 font-serif text-lg font-medium">
                      In-Process Hybrid Search
                    </h3>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed">
                      Sparse BM25 + 384-d dense embeddings in a contiguous Float32 binary file fused
                      via RRF. Exact sections pinned with score 9999.
                    </p>
                  </div>
                  <div className="border-l-2 border-info pl-4">
                    <p className="font-mono text-xs text-info">PHASE 2</p>
                    <h3 className="mt-1 font-serif text-lg font-medium">Constrained Generation</h3>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed">
                      The LLM is treated as an untrusted writer locked into a 14k context budget and
                      forced to output in an AST citation grammar.
                    </p>
                  </div>
                  <div className="border-l-2 border-verified pl-4">
                    <p className="font-mono text-xs text-verified">PHASE 3</p>
                    <h3 className="mt-1 font-serif text-lg font-medium">
                      Deterministic Verification
                    </h3>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed">
                      A non-LLM parser verifies existence, prompt provenance, and verbatim substring
                      match against the Gazette before the user sees it.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* INTERACTIVE PIPELINE STEPPER */}
        <section className="relative py-16 sm:py-24 bg-surface/30 border-b border-border">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <Reveal>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                    Step-by-Step Architecture
                  </p>
                  <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
                    The 8 stages of statutory verification.
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-muted max-w-md">
                  Click on any stage below to inspect the engineering implementation, mathematical
                  formulation, and sample TypeScript code.
                </p>
              </div>
            </Reveal>

            <div className="mt-8">
              <MethodologyPipeline />
            </div>
          </div>
        </section>

        {/* MATHEMATICAL PILLARS */}
        <section className="relative py-16 sm:py-24 border-b border-border bg-background">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <Reveal>
              <div className="max-w-3xl">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                  Algorithmic Rigor
                </p>
                <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
                  The mathematical foundations of PatraSaar.
                </h2>
                <p className="mt-3 text-sm sm:text-base text-muted">
                  Every retrieval score and verification status is derived from reproducible,
                  transparent formulas rather than opaque black-box heuristics.
                </p>
              </div>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
              {MATHEMATICAL_PILLARS.map((p, idx) => {
                const Icon = p.icon
                return (
                  <div
                    key={idx}
                    className="rounded-card border border-border bg-surface p-6 shadow-soft flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-medium text-accent">
                          {p.badge}
                        </span>
                        <div className="rounded-control bg-accent-soft p-1.5 text-accent">
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>

                      <h3 className="mt-4 font-serif text-xl font-medium text-foreground">
                        {p.title}
                      </h3>

                      {/* Formula Card */}
                      <div className="mt-3 rounded-control border border-border bg-background/80 p-3 font-mono text-xs text-info overflow-x-auto">
                        <code>{p.formula}</code>
                      </div>

                      <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    {/* Parameters Grid */}
                    <div className="mt-6 pt-4 border-t border-border/80 flex flex-wrap gap-2">
                      {p.parameters.map((param, pIdx) => (
                        <span
                          key={pIdx}
                          className="rounded bg-surface-2 border border-border/70 px-2 py-0.5 font-mono text-[11px] text-foreground/80"
                        >
                          {param}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* WHY DETERMINISTIC BEATS "LLM-AS-A-JUDGE" */}
        <section className="relative py-16 sm:py-24 bg-surface/20 border-b border-border">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <Reveal>
              <div className="text-center max-w-3xl mx-auto">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-danger">
                  Architectural Contrast
                </p>
                <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
                  Why deterministic AST verification beats &ldquo;LLM-as-a-Judge&rdquo;.
                </h2>
                <p className="mt-3 text-sm text-muted">
                  Many modern AI frameworks use a second LLM to evaluate the first LLM. In statutory
                  law, this is mathematically flawed.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* THE WRONG WAY */}
              <div className="rounded-card border border-danger/40 bg-surface p-6 sm:p-8 shadow-lift">
                <div className="flex items-center gap-2 text-danger">
                  <XCircle className="h-5 w-5" />
                  <h3 className="font-serif text-xl font-medium">
                    The &ldquo;LLM-as-a-Judge&rdquo; Anti-Pattern
                  </h3>
                </div>
                <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed">
                  Prompting another model with &ldquo;Evaluate if this citation is correct&rdquo;
                  creates a circular epistemic loop:
                </p>
                <ul className="mt-4 space-y-3 text-xs sm:text-sm text-foreground/90">
                  <li className="flex items-start gap-2">
                    <span className="text-danger shrink-0 font-bold">✕</span>
                    <span>
                      <strong>Second-Order Hallucinations:</strong> The evaluator LLM can
                      hallucinate statutory text just as easily as the generation LLM.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-danger shrink-0 font-bold">✕</span>
                    <span>
                      <strong>Sycophancy & Tone Bias:</strong> Evaluator LLMs routinely accept false
                      propositions if written with high legal confidence.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-danger shrink-0 font-bold">✕</span>
                    <span>
                      <strong>Nondeterministic Flakiness:</strong> The same citation can pass at
                      9:00 AM and fail at 9:05 AM due to temperature variance.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-danger shrink-0 font-bold">✕</span>
                    <span>
                      <strong>Severe Latency & Cost:</strong> Doubles token expenditure and
                      introduces 3-5 seconds of additional API roundtrip delay.
                    </span>
                  </li>
                </ul>
              </div>

              {/* THE PATRASAAR WAY */}
              <div className="rounded-card border border-verified/50 bg-surface p-6 sm:p-8 shadow-lift ring-1 ring-verified/20">
                <div className="flex items-center gap-2 text-verified">
                  <CheckCircle2 className="h-5 w-5" />
                  <h3 className="font-serif text-xl font-medium">
                    PatraSaar&apos;s Deterministic Verifier
                  </h3>
                </div>
                <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed">
                  Treating statutory verification as a syntax compilation check:
                </p>
                <ul className="mt-4 space-y-3 text-xs sm:text-sm text-foreground/90">
                  <li className="flex items-start gap-2">
                    <span className="text-verified shrink-0 font-bold">✓</span>
                    <span>
                      <strong>Binary Ground Truth:</strong> Quotes either appear verbatim in the
                      Bare Act or they do not. There is no probability involved.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-verified shrink-0 font-bold">✓</span>
                    <span>
                      <strong>Zero Evaluator Hallucination:</strong> Regular expressions and string
                      equality algorithms cannot hallucinate.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-verified shrink-0 font-bold">✓</span>
                    <span>
                      <strong>100% Reproducible:</strong> Deterministic unit tests assert exact
                      match results on every Git commit in CI.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-verified shrink-0 font-bold">✓</span>
                    <span>
                      <strong>Sub-Millisecond Execution:</strong> AST parsing and substring matching
                      execute in &lt; 1ms on the Node.js server.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="relative py-16 border-t border-border bg-gradient-to-t from-surface to-background">
          <div className="mx-auto max-w-4xl px-5 text-center sm:px-6">
            <Reveal>
              <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight">
                Inspect the pipeline in action.
              </h2>
              <p className="mt-4 text-base text-muted max-w-xl mx-auto">
                Test our hybrid RRF retrieval and deterministic citation verification on real Indian
                statutory questions.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/chat"
                  className="rounded-control bg-accent px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[.98] inline-flex items-center gap-2 shadow-soft"
                >
                  <span>Open Legal Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/compare"
                  className="rounded-control border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground transition-all hover:border-border-strong hover:bg-surface-2"
                >
                  View Side-by-Side Comparison
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
