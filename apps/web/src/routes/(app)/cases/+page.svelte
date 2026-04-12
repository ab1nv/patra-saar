<svelte:head>
  <title>Cases — PatraSaar</title>
</svelte:head>

<div class="p-8">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold mb-1">Case Folders</h1>
      <p class="text-[var(--color-text-secondary)]">
        Group related documents into cases for organized research.
      </p>
    </div>
    <button
      data-testid="create-case-btn"
      class="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
    >
      New Case
    </button>
  </div>

  <div data-testid="cases-list">
    <p class="text-sm text-[var(--color-text-muted)]">No cases yet. Create one to get started.</p>
  </div>
</div>
