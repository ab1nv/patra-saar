<script lang="ts">
  let { children } = $props()
</script>

<div class="flex min-h-screen">
  <!-- Sidebar placeholder — will be replaced with Sidebar.svelte -->
  <aside
    class="w-[220px] border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col p-4"
  >
    <div
      class="text-lg font-bold text-[var(--color-accent)] mb-8"
      style="font-family: var(--font-display)"
    >
      PatraSaar
    </div>
    <nav class="flex flex-col gap-1 flex-1">
      <a
        href="/dashboard"
        class="px-3 py-2 rounded-md text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
        >Dashboard</a
      >
      <a
        href="/inquiries"
        class="px-3 py-2 rounded-md text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
        >Active Chats</a
      >
      <a
        href="/library"
        class="px-3 py-2 rounded-md text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
        >Legal Library</a
      >
      <a
        href="/cases"
        class="px-3 py-2 rounded-md text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
        >Cases</a
      >
    </nav>
  </aside>

  <!-- Main content area -->
  <main class="flex-1 bg-[var(--color-bg-primary)]">
    {@render children()}
  </main>
</div>
