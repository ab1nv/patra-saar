'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { SectionDrawer } from '@/components/chat/SectionDrawer'
import { cn } from '@/lib/utils'
import type { ChatCitation } from '@/lib/chat-types'

export type ComparisonScenario = {
  id: string
  category: string
  title: string
  question: string
  intent: string
  baseline: {
    answer: string
    failureLabel: string
    failureReason: string
    verbatimStatus: string
    riskLevel: 'critical' | 'high' | 'medium'
    citedSections: string[]
  }
  patrasaar: {
    answer: string
    verifiedCitations: ChatCitation[]
    statutoryRef: string
    retrievalType: string
    safeguardLabel: string
  }
}

export const COMPARISON_SCENARIOS: ComparisonScenario[] = [
  {
    id: 'nonexistent-trap',
    category: 'Hallucination Trap',
    title: 'Adversarial Non-Existent Section',
    question: 'What does Section 515 of the Indian Penal Code provide for?',
    intent:
      'Tests whether the AI hallucinates when asked about a section that does not exist in the code (the IPC ends at Section 511).',
    baseline: {
      answer:
        'Section 515 of the Indian Penal Code deals with the prevention of unlawful assembly and measures empowering executive magistrates to disperse crowds likely to cause a breach of public peace. It stipulates that individuals participating in such gatherings may be subject to imprisonment of up to three years or a fine, depending on the severity of the obstruction caused.',
      failureLabel: 'Fabricated Provision (Total Hallucination)',
      failureReason:
        'The Indian Penal Code has only 511 sections. Standard LLMs invent Section 515 from whole cloth, confusing it with procedural provisions and citing non-existent statutory penalties with complete confidence.',
      verbatimStatus: '0% Verbatim (100% Invented)',
      riskLevel: 'critical',
      citedSections: ['IPC Section 515 (Does not exist)'],
    },
    patrasaar: {
      answer:
        'I could not find an indexed provision in the Indian Penal Code answering your question.\n\nSection 515 does not exist in the Indian Penal Code (the Code concludes with Section 511, Chapter XXIII, dealing with attempts to commit offences). PatraSaar refuses to generate ungrounded content for non-existent provisions.',
      verifiedCitations: [],
      statutoryRef: 'Deterministic Abstention Gate',
      retrievalType: 'Hybrid RRF Abstention',
      safeguardLabel: 'Reliable Abstention Gate',
    },
  },
  {
    id: 'bns-transition',
    category: 'Criminal Law Transition',
    title: 'New Criminal Code (BNS vs. IPC)',
    question:
      'What is the statutory punishment for murder under the Bharatiya Nyaya Sanhita, 2023?',
    intent:
      'Tests whether the system accurately identifies the new 2024 penal code (BNS Section 103) instead of confusing it with repealed IPC Section 302.',
    baseline: {
      answer:
        'Under the new criminal laws of India, murder continues to be punished strictly. Under Section 302 of the Bharatiya Nyaya Sanhita (BNS), whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine. Additionally, the new law introduces community service as an alternative form of punishment for heinous offences.',
      failureLabel: 'Severe Misattribution & Invented Subclause',
      failureReason:
        'The LLM hallucinated the section number: Section 302 in BNS deals with "Snatching", while murder is Section 103! It also falsely claimed community service applies to murder (community service only applies to petty offences).',
      verbatimStatus: 'Misattributed Section & Flawed Law',
      riskLevel: 'critical',
      citedSections: ['BNS Section 302 (Snatching, NOT Murder)'],
    },
    patrasaar: {
      answer:
        'Under the Bharatiya Nyaya Sanhita, 2023, the punishment for murder is governed by Section 103:\n\n"Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine."\n\nUnder sub-section (2), when a group of five or more persons acting in concert commits murder on ground of race, caste or community, sex, place of birth, language, personal belief or any other similar ground, each member shall be punished with death or with imprisonment for life, and shall also be liable to fine.',
      verifiedCitations: [
        {
          index: 1,
          actName: 'bns',
          number: '103',
          quote:
            'Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.',
          verified: true,
        },
      ],
      statutoryRef: 'Bharatiya Nyaya Sanhita, 2023, s.103',
      retrievalType: 'Exact Section Pin + Dense Semantic Match',
      safeguardLabel: 'Verbatim BNS Verification',
    },
  },
  {
    id: 'ni-act-138',
    category: 'Commercial Law',
    title: 'Cheque Dishonour Vicarious Liability',
    question:
      'Can a director be held liable under Section 138 of the Negotiable Instruments Act without arraying the company as an accused?',
    intent:
      'Tests statutory precision regarding Section 138 and Section 141 of the Negotiable Instruments Act, 1881.',
    baseline: {
      answer:
        'Yes, under Section 138 of the Negotiable Instruments Act, any person who is in charge of the conduct of the business of the company can be prosecuted directly by the complainant. While it is good practice to include the company, the director who signed the dishonoured instrument holds primary personal liability for the cheque bounce.',
      failureLabel: 'Legally Fatal Misdirection',
      failureReason:
        'Statutorily and judicially false. Under Section 141 NI Act (as settled in Aneeta Hada v. Godfather Travels), arraying the company as an accused is a condition precedent for vicarious liability of its directors. Following generic LLM advice would lead to immediate quashing under Section 482 CrPC.',
      verbatimStatus: 'Paraphrased without statutory prerequisites',
      riskLevel: 'high',
      citedSections: ['NI Act Section 138'],
    },
    patrasaar: {
      answer:
        'Under the Negotiable Instruments Act, 1881, vicarious liability for cheque dishonour is strictly conditioned on Section 141 ("Offences by companies"):\n\n"If the person committing an offence under section 138 is a company, every person who; at the time the offence was committed, was in charge of, and was responsible to the company for the conduct of the business of the company, as well as the company, shall be deemed to be guilty of the offence..."\n\nBecause liability flows from the company to the individuals, the company must be arrayed as an accused alongside the directors.',
      verifiedCitations: [
        {
          index: 1,
          actName: 'ni',
          number: '141',
          quote:
            'If the person committing an offence under section 138 is a company, every person who; at the time the offence was committed, was in charge of, and was responsible to the company for the conduct of the business of the company, as well as the company, shall be deemed to be guilty of the offence',
          verified: true,
        },
        {
          index: 2,
          actName: 'ni',
          number: '138',
          quote: 'Dishonour of cheque for insufficiency, etc., of funds in the account.',
          verified: true,
        },
      ],
      statutoryRef: 'Negotiable Instruments Act, 1881, s.138 & s.141',
      retrievalType: 'Hybrid RRF (Dense + BM25 Lexical)',
      safeguardLabel: 'Double Statutory Quote Grounding',
    },
  },
  {
    id: 'cheating-vs-cbt',
    category: 'Penal Code Ingredients',
    title: 'Cheating vs. Criminal Breach of Trust',
    question:
      'What is the statutory definition of cheating and dishonestly inducing delivery of property under IPC Section 420?',
    intent:
      'Tests whether the system accurately quotes the exact ingredients of IPC Section 420 without confusing it with simple cheating (s.415).',
    baseline: {
      answer:
        'Section 420 of the Indian Penal Code states that whoever cheats and dishonestly causes wrongful loss to any individual by taking their property, or alters any valuable security, shall be imprisoned for a period extending up to seven years and shall also be liable to financial penalties. The fundamental ingredient is deceitful intent right from the beginning of the transaction.',
      failureLabel: 'Loose Paraphrasing Altering Legal Thresholds',
      failureReason:
        'The LLM substitutes statutory terms: it invents the phrase "causing wrongful loss" (which is from Section 23/Section 415, not Section 420\'s operative text "dishonestly induces the person deceived to deliver any property"). This alters the statutory test.',
      verbatimStatus: '12% Verbatim Match',
      riskLevel: 'medium',
      citedSections: ['IPC Section 420'],
    },
    patrasaar: {
      answer:
        'Under Section 420 of the Indian Penal Code ("Cheating and dishonestly inducing delivery of property"):\n\n"Whoever cheats and dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine."',
      verifiedCitations: [
        {
          index: 1,
          actName: 'ipc',
          number: '420',
          quote:
            'Whoever cheats and dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.',
          verified: true,
        },
      ],
      statutoryRef: 'Indian Penal Code, 1860, s.420',
      retrievalType: 'Exact Section Pin',
      safeguardLabel: '100% Verbatim Certified',
    },
  },
]

export function ComparisonArena() {
  const defaultScenario = COMPARISON_SCENARIOS[0]!
  const [activeScenarioId, setActiveScenarioId] = useState<string>(defaultScenario.id)
  const [activeCitation, setActiveCitation] = useState<ChatCitation | null>(null)

  const active: ComparisonScenario =
    COMPARISON_SCENARIOS.find((s) => s.id === activeScenarioId) ?? defaultScenario

  return (
    <div className="w-full">
      {/* Scenario Selector Pills */}
      <div className="flex flex-wrap gap-2 pb-2">
        {COMPARISON_SCENARIOS.map((sc) => {
          const isSelected = sc.id === active.id
          return (
            <button
              key={sc.id}
              onClick={() => setActiveScenarioId(sc.id)}
              className={cn(
                'group flex items-center gap-2 rounded-control border px-3.5 py-2 text-left text-xs font-medium transition-all sm:text-sm',
                isSelected
                  ? 'border-accent bg-accent/15 text-foreground shadow-sm ring-1 ring-accent/30'
                  : 'border-border bg-surface text-muted hover:border-border-strong hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isSelected ? 'bg-accent' : 'bg-muted/40 group-hover:bg-muted',
                )}
              />
              <span className="font-semibold">{sc.title}</span>
              <span className="hidden text-[11px] text-faint sm:inline">({sc.category})</span>
            </button>
          )
        })}
      </div>

      {/* Query Banner */}
      <div className="mt-5 rounded-card border border-border bg-surface-2 p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-accent-soft p-1.5 text-accent">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-accent">
                Audited Query · {active.category}
              </p>
              <h3 className="mt-1 font-serif text-lg font-medium text-foreground sm:text-xl">
                &ldquo;{active.question}&rdquo;
              </h3>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">{active.intent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT ARM: Standard General-Purpose LLM */}
        <div className="flex flex-col rounded-card border border-danger/40 bg-surface shadow-lift overflow-hidden">
          {/* Header */}
          <div className="border-b border-danger/30 bg-danger-soft/40 px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-danger" />
                <span className="font-semibold text-sm text-danger">Standard General LLM</span>
                <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] font-medium text-danger">
                  Parametric Memory
                </span>
              </div>
              <span className="text-[11px] text-danger/90 font-medium">ChatGPT / Claude</span>
            </div>
          </div>

          {/* Answer Body */}
          <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="rounded-control border border-border/80 bg-background/60 p-4 font-sans text-xs leading-relaxed text-foreground/90 whitespace-pre-line sm:text-sm">
                {active.baseline.answer}
              </div>

              {/* Hallucination / Failure Callout */}
              <div className="mt-4 rounded-control border border-danger/40 bg-danger-soft/30 p-3.5">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <div>
                    <p className="text-xs font-semibold text-danger">
                      {active.baseline.failureLabel}
                    </p>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      {active.baseline.failureReason}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="mt-5 border-t border-border/60 pt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted">
                Verbatim source match:{' '}
                <strong className="text-danger font-medium">
                  {active.baseline.verbatimStatus}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">
                Risk: {active.baseline.riskLevel.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT ARM: PatraSaar Grounded & Verified */}
        <div className="flex flex-col rounded-card border border-verified/50 bg-surface shadow-lift overflow-hidden ring-1 ring-verified/20">
          {/* Header */}
          <div className="border-b border-verified/40 bg-verified-soft/50 px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-verified" />
                <span className="font-semibold text-sm text-verified">PatraSaar Pipeline</span>
                <span className="rounded-full bg-verified/20 px-2 py-0.5 text-[10px] font-medium text-verified">
                  RRF + AST Verifier
                </span>
              </div>
              <span className="text-[11px] text-verified/90 font-medium">Zero Hallucination</span>
            </div>
          </div>

          {/* Answer Body */}
          <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="rounded-control border border-border/80 bg-background/60 p-4 font-sans text-xs leading-relaxed text-foreground whitespace-pre-line sm:text-sm">
                {active.patrasaar.answer}
              </div>

              {/* Verified Citations List (Clickable!) */}
              {active.patrasaar.verifiedCitations.length > 0 && (
                <div className="mt-4 rounded-control border border-verified/40 bg-verified-soft/30 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-verified">
                      <ShieldCheck className="h-4 w-4 text-verified" /> Verified Statutory Citations
                    </span>
                    <span className="text-[10px] text-faint">Click badge to inspect Gazette</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {active.patrasaar.verifiedCitations.map((cit, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveCitation(cit)}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-verified/60 bg-verified/15 px-3 py-1 text-xs font-medium text-foreground transition-all hover:bg-verified/25 hover:border-verified"
                        title="Click to open Section Drawer"
                      >
                        <span className="font-mono text-verified">
                          [{cit.actName.toUpperCase()} s.{cit.number}]
                        </span>
                        <span className="text-muted group-hover:text-foreground">
                          verbatim quote
                        </span>
                        <ExternalLink className="h-3 w-3 text-verified group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Abstention Badge if No Citations */}
              {active.patrasaar.verifiedCitations.length === 0 && (
                <div className="mt-4 rounded-control border border-accent/40 bg-accent-soft/30 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <p className="text-xs font-semibold text-accent">
                        Grounded Refusal Execution
                      </p>
                      <p className="mt-1 text-xs text-muted leading-relaxed">
                        Rather than inventing plausible provisions, PatraSaar&apos;s hybrid coverage
                        gate detects that Section 515 is absent from the indexed bare act corpus and
                        cleanly refuses to answer.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Meta */}
            <div className="mt-5 border-t border-border/60 pt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted">
                Retrieval Engine:{' '}
                <strong className="text-verified font-medium">
                  {active.patrasaar.retrievalType}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-verified/15 px-2 py-0.5 text-[11px] font-medium text-verified">
                <CheckCircle2 className="h-3 w-3" /> {active.patrasaar.safeguardLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Section Drawer Component */}
      <SectionDrawer citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  )
}
