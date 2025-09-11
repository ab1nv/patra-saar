'use client';

import { FileUpload } from '@/components/FileUpload';
import { DocumentViewer } from '@/components/DocumentViewer';
import MetaballBackground from '@/components/MetaballBackground';
import { useDocumentStore } from '@/stores/useDocumentStore';
import Image from 'next/image';

export default function Home() {
  const { documentId } = useDocumentStore();

  return (
    <>
  {/* Metaball Background */}
  <MetaballBackground className="fixed inset-0 w-screen h-screen z-0" />
      
  {/* Content overlay */}
  <div className="min-h-screen relative z-10">

        {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-32">
          {!documentId ? (
            <div className="text-center pt-16 md:pt-10">{/* reduced top spacing */}
              <div className="mb-6">
                <Image
                  src="/assets/logo.png"
                  alt="PatraSaar Logo"
                  width={500}
                  height={500}
                  className="mx-auto h-24 w-24 select-none"
                  priority
                />
              </div>
              <div id="upload" className="max-w-md mx-auto bg-black/25 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl shadow-black/40">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Upload Your Legal Document
                </h2>
                <p className="text-white/80 mb-8">
                  Get clear, simple explanations of complex legal jargon in your documents
                </p>
                <FileUpload />
                  <p className="mt-4 text-xs text-white/50">Documents are processed transiently. No long-term storage. Not a substitute for professional legal advice.</p>
              </div>
            </div>
          ) : (
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <DocumentViewer />
            </div>
          )}

            {/* Features Section */}
            <section id="features" className="scroll-mt-28">
              <div className="mx-auto max-w-5xl">
                <h3 className="text-2xl font-semibold text-white tracking-wide">Core Capabilities</h3>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {[
                    { title: 'Clause Simplification', desc: 'Transforms dense contract clauses into plain-language summaries.' },
                    { title: 'Entity & Obligation Extraction', desc: 'Identifies parties, timelines, monetary amounts, and duties automatically.' },
                    { title: 'Risk & Red Flag Indicators', desc: 'Highlights uncommon indemnities, broad termination triggers, or missing protections.' },
                    { title: 'Compliance Tagging', desc: 'Surfacing data/privacy references (GDPR, DPAs) and confidentiality provisions.' }
                  ].map(card => (
                    <div key={card.title} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                      <h4 className="font-medium text-white mb-1">{card.title}</h4>
                      <p className="text-sm text-white/70 leading-relaxed">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Process Section */}
            <section id="how-it-works" className="scroll-mt-28">
              <div className="mx-auto max-w-4xl">
                <h3 className="text-2xl font-semibold text-white tracking-wide mb-6">Process</h3>
                <ol className="relative border-l border-white/10 ml-4 space-y-8">
                  {[
                    { t: 'Upload', d: 'Provide a PDF or supported document securely.' },
                    { t: 'Analyze', d: 'Text extraction & structural parsing optimized for legal formatting.' },
                    { t: 'Summarize', d: 'Semantic and clause-aware simplification with key point distillation.' },
                    { t: 'Review', d: 'Scan risk indicators and extracted entities for accuracy.' }
                  ].map((step,i)=> (
                    <li key={step.t} className="ml-4">
                      <div className="absolute -left-3 mt-1 h-5 w-5 rounded-full bg-[var(--brand-gold)]/25 ring-2 ring-[var(--brand-gold)]/40 flex items-center justify-center text-[10px] text-[var(--brand-ink)]">{i+1}</div>
                      <h4 className="text-white font-medium">{step.t}</h4>
                      <p className="text-sm text-white/65">{step.d}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Security Section */}
            <section id="security" className="scroll-mt-28">
              <div className="mx-auto max-w-5xl">
                <h3 className="text-2xl font-semibold text-white tracking-wide mb-6">Security</h3>
                <div className="grid gap-6 sm:grid-cols-3">
                  {[
                    { t: 'Encryption', d: 'Transport-layer encryption for all uploads.' },
                    { t: 'Ephemeral Processing', d: 'In-memory analysis; no long-term retention.' },
                    { t: 'Isolation', d: 'Logical isolation per document session.' }
                  ].map(item => (
                    <div key={item.t} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                      <h4 className="text-white font-medium mb-1">{item.t}</h4>
                      <p className="text-sm text-white/70">{item.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Compliance Section */}
            <section id="compliance" className="scroll-mt-28">
              <div className="mx-auto max-w-4xl">
                <h3 className="text-2xl font-semibold text-white tracking-wide mb-6">Compliance (Roadmap)</h3>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {[
                    'Planned SOC 2 alignment',
                    'Privacy-first data handling',
                    'GDPR-friendly architecture',
                    'Configurable retention policies'
                  ].map(i => (
                    <li key={i} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[var(--brand-gold)]" />
                      {i}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-white/40">Compliance statements are roadmap intentions and not formal certifications yet.</p>
              </div>
            </section>
      </main>
          <footer className="mt-32 border-t border-white/10 bg-black/30 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-sm text-white/60 space-y-4">
              <div className="flex flex-wrap gap-6">
                <div className="min-w-[180px]">
                  <h5 className="text-white font-semibold mb-2 text-xs tracking-wide">PatraSaar</h5>
                  <p className="text-xs leading-relaxed">AI-assisted simplification of Indian legal documents for faster understanding.</p>
                </div>
                <div className="min-w-[150px]">
                  <h5 className="text-white font-semibold mb-2 text-xs tracking-wide">Legal</h5>
                  <ul className="space-y-1 text-xs">
                    <li>Disclaimer (informational only)</li>
                    <li>Privacy (ephemeral processing)</li>
                    <li>Security Overview</li>
                  </ul>
                </div>
              </div>
              <p className="text-[10px] text-white/40">Not a substitute for professional legal advice. © {new Date().getFullYear()} PatraSaar.</p>
            </div>
          </footer>
      </div>
    </>
  );
}