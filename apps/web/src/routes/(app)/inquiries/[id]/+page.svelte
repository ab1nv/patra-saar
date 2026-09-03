<script lang="ts">
  let { data } = $props()
  let query = $state('')
</script>

<svelte:head>
  <title>Inquiry — PatraSaar</title>
</svelte:head>

<div class="flex h-full">
  <!-- Chat area -->
  <div class="flex-1 flex flex-col">
    <div class="flex-1 p-8 overflow-y-auto">
      <p class="text-[var(--color-text-muted)]">Ask a question grounded in Indian law.</p>
    </div>

    <!-- Chat input -->
    <div class="border-t border-[var(--color-border)] p-4">
      <textarea
        data-testid="chat-input"
        bind:value={query}
        placeholder="Ask a legal question…"
        rows="3"
        class="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      ></textarea>
    </div>
  </div>

  <!-- Citation panel -->
  <aside class="w-[320px] border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
    <h2 class="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">Sovereign Citations</h2>
    <p class="text-xs text-[var(--color-text-muted)]">Citations will appear here after a query.</p>
  </aside>
</div>
