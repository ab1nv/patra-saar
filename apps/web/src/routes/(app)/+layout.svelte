<script lang="ts">
  import { Plus } from 'lucide-svelte'
  let { children } = $props()
</script>

<div class="flex h-screen overflow-hidden">
  <!-- Left Panel: History Sidebar -->
  <aside
    class="w-[260px] border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col shrink-0"
  >
    <div class="p-4 border-b border-[var(--color-border)]">
      <a
        href="/dashboard"
        class="flex items-center gap-2 w-full px-3 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text-primary)] transition-colors"
      >
        <Plus size={16} />
        New Case Inquiry
      </a>
    </div>

    <div class="flex-1 overflow-y-auto p-2">
      <div
        class="px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 mt-4 text-center"
      >
        History Not Saved Per Session
      </div>
      <!-- Mocked chats could go here or remain empty -->
    </div>

    <!-- User Profile area -->
    <div class="p-4 border-t border-[var(--color-border)] flex items-center gap-3">
      <div
        class="w-8 h-8 rounded-full bg-[var(--color-accent-muted)] flex items-center justify-center text-xs font-bold text-white"
      >
        U
      </div>
      <div class="text-sm font-medium text-[var(--color-text-secondary)]">Session User</div>
    </div>
  </aside>

  <!-- Main content area -->
  <main class="flex-1 bg-[var(--color-bg-primary)] h-full overflow-hidden">
    {@render children()}
  </main>
</div>
