<script lang="ts">
  let files = $state<FileList | null>(null)
</script>

<svelte:head>
  <title>Legal Library — PatraSaar</title>
</svelte:head>

<div class="p-8">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold mb-1">Legal Library</h1>
      <p class="text-[var(--color-text-secondary)]">All your uploaded documents in one place.</p>
    </div>
    <label
      data-testid="upload-btn"
      class="cursor-pointer inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
    >
      Upload Document
      <input
        type="file"
        accept=".pdf"
        bind:files
        class="sr-only"
      />
    </label>
  </div>

  <div data-testid="document-list">
    <p class="text-sm text-[var(--color-text-muted)]">No documents yet. Upload a PDF to get started.</p>
  </div>
</div>
