<script lang="ts">
  import Hero from '$lib/components/landing/Hero.svelte'
</script>

<svelte:head>
  <title>PatraSaar — Sovereign Intelligence for Indian Law</title>
  <meta
    name="description"
    content="PatraSaar: Real Citations. Real Laws. Zero Hallucinations. AI-powered legal document analysis grounded exclusively in verified Indian statutes and case law."
  />
</svelte:head>

<main class="bg-[var(--color-bg-primary)] min-h-screen">
  <Hero />

  <!-- Capabilities Section -->
  <section
    id="capabilities"
    class="py-24 px-6 bg-[var(--color-bg-secondary)] border-y border-[var(--color-border)]"
  >
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <h2
          class="text-3xl md:text-5xl font-display font-medium mb-4 text-[var(--color-text-primary)]"
        >
          The Neural RAG Pipeline
        </h2>
        <p class="text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto">
          PatraSaar does not guess. Every claim is cross-referenced against the Indian legal corpus.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <!-- Feature 1 -->
        <div
          class="p-8 bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-accent-muted)] transition-colors group"
        >
          <div
            class="w-12 h-12 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-lg flex items-center justify-center mb-6 text-xl font-bold group-hover:scale-110 transition-transform"
          >
            1
          </div>
          <h3 class="text-xl font-bold mb-3 text-[var(--color-text-primary)]">Document Analysis</h3>
          <p class="text-[var(--color-text-secondary)]">
            PatraSaar index-reads your entire uploaded document (FIR, contract, notice) and
            identifies risk clauses, obligations, and legal loopholes instantly.
          </p>
        </div>
        <!-- Feature 2 -->
        <div
          class="p-8 bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-accent-muted)] transition-colors group"
        >
          <div
            class="w-12 h-12 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-lg flex items-center justify-center mb-6 text-xl font-bold group-hover:scale-110 transition-transform"
          >
            2
          </div>
          <h3 class="text-xl font-bold mb-3 text-[var(--color-text-primary)]">
            BNS/IPC Transitioning
          </h3>
          <p class="text-[var(--color-text-secondary)]">
            Automatically cross-references old IPC segments into their new Bharatiya Nyaya Sanhita
            equivalents for modern compliance and court filings.
          </p>
        </div>
        <!-- Feature 3 -->
        <div
          class="p-8 bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-accent-muted)] transition-colors group"
        >
          <div
            class="w-12 h-12 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-lg flex items-center justify-center mb-6 text-xl font-bold group-hover:scale-110 transition-transform"
          >
            3
          </div>
          <h3 class="text-xl font-bold mb-3 text-[var(--color-text-primary)]">
            Sovereign Citations
          </h3>
          <p class="text-[var(--color-text-secondary)]">
            No hallucinations. Every answer links back to a verified Indian statute or Supreme Court
            precedent with high confidence scoring.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Versus ChatGPT Section -->
  <section class="py-24 px-6">
    <div class="max-w-5xl mx-auto">
      <div
        class="bg-[var(--color-bg-tertiary)] rounded-3xl p-8 md:p-16 border border-[var(--color-border)]"
      >
        <h2
          class="text-3xl md:text-4xl font-display font-medium mb-12 text-center text-[var(--color-text-primary)]"
        >
          Why PatraSaar beats Generic AI
        </h2>

        <div class="space-y-6">
          <div
            class="flex flex-col md:flex-row gap-4 items-center bg-[var(--color-bg-secondary)] p-6 rounded-xl border border-[var(--color-border)]"
          >
            <div class="w-full md:w-1/2">
              <h4
                class="font-bold text-red-400 mb-2 whitespace-nowrap bg-red-400/10 px-3 py-1 rounded inline-block"
              >
                Generic AI / ChatGPT
              </h4>
              <p class="text-[var(--color-text-secondary)] text-sm">
                Trained mostly on US/Western law. Frequently fabricates Indian fake IPC sections and
                case names.
              </p>
            </div>
            <div class="hidden md:flex text-[var(--color-border)] font-bold text-2xl">VS</div>
            <div class="w-full md:w-1/2">
              <h4
                class="font-bold text-[var(--color-accent)] mb-2 whitespace-nowrap bg-[var(--color-accent)]/10 px-3 py-1 rounded inline-block"
              >
                PatraSaar
              </h4>
              <p class="text-[var(--color-text-secondary)] text-sm">
                Grounded purely in Indian law. Every statute is verified and clickable. Built around
                local legal workflows.
              </p>
            </div>
          </div>

          <div
            class="flex flex-col md:flex-row gap-4 items-center bg-[var(--color-bg-secondary)] p-6 rounded-xl border border-[var(--color-border)]"
          >
            <div class="w-full md:w-1/2">
              <h4
                class="font-bold text-red-400 mb-2 whitespace-nowrap bg-red-400/10 px-3 py-1 rounded inline-block"
              >
                Generic AI / ChatGPT
              </h4>
              <p class="text-[var(--color-text-secondary)] text-sm">
                Treats your complex contract as an isolated chat. Forgets the document details after
                a few messages.
              </p>
            </div>
            <div class="hidden md:flex text-[var(--color-border)] font-bold text-2xl">VS</div>
            <div class="w-full md:w-1/2">
              <h4
                class="font-bold text-[var(--color-accent)] mb-2 whitespace-nowrap bg-[var(--color-accent)]/10 px-3 py-1 rounded inline-block"
              >
                PatraSaar
              </h4>
              <p class="text-[var(--color-text-secondary)] text-sm">
                Creates persistent legal workspaces. Remembers case folders, cross-questioning
                history, and builds automated timelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Use Cases -->
  <section class="py-24 px-6 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
    <div class="max-w-6xl mx-auto text-center">
      <h2 class="text-3xl font-display font-medium mb-16 text-[var(--color-text-primary)]">
        Built for the Indian Ecosystem
      </h2>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="p-6">
          <h4 class="font-bold text-xl mb-2 text-[var(--color-accent)]">Advocates</h4>
          <p class="text-[var(--color-text-secondary)] text-sm">
            Accelerate research from 3 days to 30 minutes. Find overlapping BNS precedents
            instantly.
          </p>
        </div>
        <div class="p-6">
          <h4 class="font-bold text-xl mb-2 text-[var(--color-accent)]">Law Firms</h4>
          <p class="text-[var(--color-text-secondary)] text-sm">
            Give associates an AI research partner that safely cites sources without fabricating
            judgments.
          </p>
        </div>
        <div class="p-6">
          <h4 class="font-bold text-xl mb-2 text-[var(--color-accent)]">Corporate</h4>
          <p class="text-[var(--color-text-secondary)] text-sm">
            Review vendor contracts and generate compliance red-flag reports before signing.
          </p>
        </div>
        <div class="p-6">
          <h4 class="font-bold text-xl mb-2 text-[var(--color-accent)]">Citizens</h4>
          <p class="text-[var(--color-text-secondary)] text-sm">
            Navigate legal notices and understand FIRs in plain language to know your rights.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <footer class="py-20 px-6 border-t border-[var(--color-border)] text-center">
    <h2 class="text-3xl font-display font-bold mb-6 text-[var(--color-text-primary)]">
      Ready for Sovereign Intelligence?
    </h2>
    <a
      href="/auth/login"
      class="inline-block px-10 py-4 bg-[var(--color-accent)] text-white font-bold rounded-xl hover:bg-[#d56213] transition-all shadow-[0_0_30px_rgba(249,115,22,0.2)]"
      >Open Workspace Now</a
    >
    <div class="mt-12 text-sm text-[var(--color-text-muted)]">
      © 2026 PatraSaar Intelligence. Real Citations. Real Laws. Zero Hallucinations.
    </div>
  </footer>
</main>
