<script lang="ts">
  let { data } = $props()
</script>

<svelte:head>
  <title>Inquiry — PatraSaar</title>
</svelte:head>

<div class="flex h-full">
  <!-- Chat area — will contain InquiryMessage components -->
  <div class="flex-1 flex flex-col p-8">
    <p class="text-[var(--color-text-muted)]">
      Inquiry view with chat + streaming will be built here.
    </p>
  </div>

  <!-- Citation panel — will contain CitationPanel component -->
  <aside class="w-[320px] border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
    <h2 class="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">
      Sovereign Citations
    </h2>
    <p class="text-xs text-[var(--color-text-muted)]">Citations will appear here after a query.</p>
  </aside>
</div>
