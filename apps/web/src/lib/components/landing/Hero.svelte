<section
  class="relative min-h-[85vh] flex flex-col items-center justify-center px-6 overflow-hidden"
>
  <!-- Dynamic gradient background -->
  <div
    class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--color-accent-muted)]/20 via-[var(--color-bg-primary)] to-[var(--color-bg-primary)] pointer-events-none"
  ></div>

  <div class="relative z-10 text-center max-w-5xl mx-auto flex flex-col items-center">
    <div
      class="mb-10 w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-2xl flex items-center justify-center overflow-hidden relative group"
    >
      <div
        class="absolute inset-0 bg-gradient-to-tr from-[var(--color-accent)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
      ></div>
      <img
        src="/assets/logo.png"
        alt="PatraSaar Logo"
        class="w-24 h-24 md:w-32 md:h-32 object-contain"
        onerror={(e) =>
          (e.currentTarget.src =
            'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGo0TTggMTJoOCIvPjwvc3ZnPg==')}
      />
    </div>

    <span
      class="inline-block px-5 py-2 text-xs font-bold tracking-[0.2em] uppercase rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent)] mb-8 shadow-sm"
    >
      Real Citations. Real Laws. Zero Hallucinations.
    </span>

    <h1
      class="text-6xl md:text-8xl font-black leading-none mb-6 tracking-tight text-[var(--color-text-primary)]"
      style="font-family: var(--font-display)"
    >
      Patra<span class="text-[var(--color-accent)]">Saar</span>
    </h1>

    <h2
      class="text-2xl md:text-3xl font-medium text-[var(--color-text-secondary)] mb-8 font-display"
    >
      Sovereign Intelligence for Indian Law
    </h2>

    <p
      class="text-lg md:text-xl text-[var(--color-text-muted)] max-w-2xl mx-auto mb-12 leading-relaxed"
    >
      Purpose-built for India. Upload any legal document and get instant, cited analysis grounded
      exclusively in Bharatiya Nyaya Sanhita, IPC, and Supreme Court precedents.
    </p>

    <div class="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
      <a
        href="/auth/login"
        class="px-10 py-4 bg-[var(--color-accent)] text-white font-bold rounded-xl hover:bg-[#d56213] transform hover:-translate-y-0.5 transition-all duration-200 shadow-[0_0_40px_rgba(249,115,22,0.3)] text-lg"
      >
        Open Workspace
      </a>
      <a
        href="#capabilities"
        class="px-10 py-4 border-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] font-semibold rounded-xl hover:border-[var(--color-text-muted)] transition-all duration-200 text-lg"
      >
        See Capabilities
      </a>
    </div>
  </div>
</section>
