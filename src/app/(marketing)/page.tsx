import Link from 'next/link'
import {
  Ban,
  FileCheck2,
  Library,
  Lock,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { corpusMeta } from '@/lib/corpus'

export const metadata = {
  title: 'PatraSaar',
}

export default function LandingPage() {
  const meta = corpusMeta()
  const acts = meta.acts.length
  const sections = meta.sectionCount.toLocaleString()

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Scale size={20} className="text-accent" />
          <span className="font-serif text-xl font-semibold">PatraSaar</span>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/coverage"
            className="rounded-md px-3 py-2 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            Coverage
          </Link>
          <Link
            href="/chat"
            className="rounded-md bg-accent px-4 py-2 font-semibold text-background hover:bg-accent-strong"
          >
            Open workspace
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,var(--color-accent-soft),transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
          <p className="mb-6 inline-block rounded-full border border-border bg-surface px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            Every citation checked against the bare act
          </p>
          <h1 className="font-serif text-5xl font-semibold leading-[1.05] md:text-6xl">
            It cites the law,
            <br />
            or it says it doesn&apos;t know.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            PatraSaar answers questions about Indian central acts using only an indexed corpus of
            statutory text. Every citation is verified verbatim against the source section before
            you see it — and if nothing relevant is found, it refuses instead of guessing.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Link
              href="/chat"
              className="rounded-lg bg-accent px-7 py-3 font-semibold text-background hover:bg-accent-strong"
            >
              Try the demo
            </Link>
            <Link
              href="/coverage"
              className="rounded-lg border border-border bg-surface px-7 py-3 font-semibold hover:border-border-strong"
            >
              What&apos;s indexed
            </Link>
          </div>
          <p className="mt-8 text-sm text-faint">
            <span className="text-muted">{sections}</span> sections across{' '}
            <span className="text-muted">{acts}</span> central acts indexed
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-serif text-3xl">The problem with asking an AI about the law</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'It invents section numbers',
              body: 'General assistants confidently produce provisions that do not exist, because nothing checks them against the actual act.',
            },
            {
              title: 'It cites repealed law',
              body: 'India replaced the IPC with the Bharatiya Nyaya Sanhita in 2023. Pre-2024 knowledge is now partly stale.',
            },
            {
              title: 'It never shows the text',
              body: 'Even when the answer is right, you cannot see where it came from or confirm the wording.',
            },
          ].map((c) => (
            <div key={c.title} className="rounded-card border border-border bg-surface p-6">
              <h3 className="font-serif text-lg">{c.title}</h3>
              <p className="mt-2 text-sm text-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-serif text-3xl">How it works</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            The point is not to stop the model from hallucinating — it is to catch it when it does.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {[
              {
                icon: Search,
                step: 'Retrieve',
                body: 'BM25 over section title + body, plus exact section lookup.',
              },
              {
                icon: Wand2,
                step: 'Constrain',
                body: 'The model only ever sees the retrieved sections and must quote them verbatim.',
              },
              {
                icon: Sparkles,
                step: 'Generate',
                body: 'The answer streams, with each assertion formatted as a citation token.',
              },
              {
                icon: FileCheck2,
                step: 'Verify',
                body: 'Each citation is checked: does the section exist, was it retrieved, is the quote verbatim?',
              },
            ].map(({ icon: Icon, step, body }, i) => (
              <div key={step} className="relative rounded-card border border-border bg-surface p-5">
                <span className="text-[11px] font-medium text-faint">Step {i + 1}</span>
                <Icon size={18} className="mt-2 text-accent" />
                <h3 className="mt-2 font-serif text-base">{step}</h3>
                <p className="mt-1.5 text-xs text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification demo */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="font-serif text-3xl">What verification looks like</h2>
        <div className="mt-6 rounded-card border border-border bg-surface p-6">
          <div className="mb-4 flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-verified/30 bg-verified-soft px-2.5 py-0.5 text-[11px] text-verified">
              ✓ 1 verified
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-0.5 text-[11px] text-warning">
              ⚠ 1 unverified
            </span>
          </div>
          <p className="text-sm text-muted">
            Murder is punishable under the Bharatiya Nyaya Sanhita. The provision reads: “Whoever
            commits murder shall be punished with death or imprisonment for life…”{' '}
            <span className="rounded border border-verified/40 bg-verified-soft px-1 text-[10px] text-verified">
              1
            </span>
          </p>
          <div className="mt-4 space-y-2">
            <div className="rounded-lg border border-verified/25 bg-verified-soft/40 px-3 py-2 text-xs">
              <span className="text-verified">✓ BNS · Section 103 — Punishment for murder</span>
              <p className="mt-1 font-serif text-muted">
                “Whoever commits murder shall be punished with death or imprisonment for life…”
              </p>
            </div>
            <div className="rounded-lg border border-warning/25 bg-warning-soft/40 px-3 py-2 text-xs">
              <span className="text-warning">⚠ IPC · Section 302 — quote_not_verbatim</span>
              <p className="mt-1 font-serif text-muted line-through decoration-warning/50">
                “Murder carries the death penalty in all cases.”
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-faint">
            The second citation is real law, but the quote was paraphrased — so it is struck through
            and flagged rather than presented as verified.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-serif text-3xl">Narrow on purpose. Here is the tradeoff.</h2>
          <div className="mt-8 overflow-hidden rounded-card border border-border">
            <table className="w-full text-sm">
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
        </div>
      </section>

      {/* Capabilities + privacy */}
      <section className="mx-auto grid max-w-5xl gap-4 px-6 py-16 md:grid-cols-3">
        {[
          {
            icon: Library,
            title: 'Published corpus',
            body: 'Six central acts, with the exact section counts and build date on the coverage page.',
          },
          {
            icon: ShieldCheck,
            title: 'Verified citations',
            body: 'Three checks: section exists, was retrieved for this question, and the quote is verbatim.',
          },
          {
            icon: Ban,
            title: 'Abstains when unsure',
            body: 'Retrieval below threshold means no answer at all, rather than a confident guess.',
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-card border border-border bg-surface p-6">
            <Icon size={18} className="mb-3 text-accent" />
            <h3 className="font-serif text-lg">{title}</h3>
            <p className="mt-1.5 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-card border border-border bg-surface p-7">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-accent" />
            <h2 className="font-serif text-xl">Privacy, stated plainly</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>
              Your questions and the generated answers are sent to our LLM provider (Groq) for
              inference.
            </li>
            <li>
              Chat history is stored in our database so you can return to it, and you can delete any
              chat at any time.
            </li>
            <li>Incognito mode does not persist the conversation at all.</li>
            <li>We run no analytics or third-party trackers.</li>
          </ul>
          <p className="mt-4 text-xs text-faint">
            We do not claim your data never leaves your device — it is sent to the model provider to
            produce an answer.
          </p>
        </div>
      </section>

      {/* Disclaimer + footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-xs text-warning">
            PatraSaar provides information about statutory text. It is not legal advice and does not
            create a lawyer–client relationship. Verify all provisions against the official bare act
            before relying on them.
          </p>
          <div className="mt-6 flex items-center justify-between text-xs text-faint">
            <span className="font-serif text-sm text-muted">PatraSaar</span>
            <span>
              Built for the Indian legal transition from the IPC to the Bharatiya Nyaya Sanhita.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
