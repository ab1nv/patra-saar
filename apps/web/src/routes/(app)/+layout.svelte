<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { Plus } from 'lucide-svelte'
  import { env } from '$env/dynamic/public'
  import { page } from '$app/state'
  import { activeCaseId, sidebarCases } from '$lib/stores/workspace'

  let { children } = $props()
  let contextMenu = $state<{ x: number; y: number; caseId: string; caseName: string } | null>(null)

  function getApiBaseUrl() {
    const raw = env.PUBLIC_API_URL ?? 'http://localhost:8787'
    return raw.replace(/\/+$/, '')
  }

  function normalizeCases(cases: unknown[]) {
    const seen = new Set<string>()
    const normalized: { id: string; name: string; created_at: number }[] = []

    for (const item of cases) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof (item as { id?: unknown }).id !== 'string' ||
        typeof (item as { name?: unknown }).name !== 'string'
      ) {
        continue
      }

      const typed = item as { id: string; name: string; created_at?: number }
      if (seen.has(typed.id)) continue
      seen.add(typed.id)

      normalized.push({
        id: typed.id,
        name: typed.name.trim() || 'Untitled Inquiry',
        created_at: typeof typed.created_at === 'number' ? typed.created_at : 0,
      })
    }

    normalized.sort((a, b) => b.created_at - a.created_at)
    return normalized
  }

  async function refreshSidebarCases() {
    const apiUrl = getApiBaseUrl()
    try {
      const res = await fetch(`${apiUrl}/cases`, { credentials: 'include' })
      if (!res.ok) return

      const data = await res.json()
      if (Array.isArray(data.cases)) {
        $sidebarCases = normalizeCases(data.cases)
      }
    } catch {
      // Keep current sidebar state on fetch failure.
    }
  }

  onMount(() => {
    refreshSidebarCases()
  })

  $effect(() => {
    if (page.url.pathname !== '/dashboard') return
    const caseFromUrl = page.url.searchParams.get('case')
    if (caseFromUrl) {
      $activeCaseId = caseFromUrl
    }
  })

  async function startNewCase() {
    contextMenu = null
    $activeCaseId = null
    await goto('/dashboard', { keepFocus: true, noScroll: true })
  }

  async function openCase(caseId: string) {
    contextMenu = null

    const currentCaseFromUrl = page.url.searchParams.get('case')
    if ($activeCaseId === caseId && currentCaseFromUrl === caseId) {
      return
    }

    $activeCaseId = caseId
    await goto(`/dashboard?case=${encodeURIComponent(caseId)}`, { keepFocus: true, noScroll: true })
  }

  function openContextMenu(e: MouseEvent, caseId: string, caseName: string) {
    e.preventDefault()
    e.stopPropagation()
    contextMenu = { x: e.clientX, y: e.clientY, caseId, caseName }
  }

  function closeContextMenu() {
    contextMenu = null
  }

  async function deleteCase(caseId: string) {
    const caseToDelete = $sidebarCases.find((item) => item.id === caseId)
    const label = caseToDelete?.name || 'this chat'
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) {
      closeContextMenu()
      return
    }

    const apiUrl = getApiBaseUrl()
    try {
      const res = await fetch(`${apiUrl}/cases/${caseId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to delete chat')
      }

      sidebarCases.update((items) => items.filter((item) => item.id !== caseId))

      if ($activeCaseId === caseId) {
        $activeCaseId = null
        await goto('/dashboard')
      }
    } catch (err) {
      console.error(err)
      window.alert('Could not delete this chat. Please try again.')
    } finally {
      closeContextMenu()
    }
  }
</script>

<svelte:window onclick={closeContextMenu} onkeydown={closeContextMenu} />

<div class="flex h-screen overflow-hidden">
  <!-- Left Panel: History Sidebar -->
  <aside
    class="w-[260px] border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col shrink-0"
  >
    <div class="p-4 border-b border-[var(--color-border)]">
      <button
        type="button"
        onclick={startNewCase}
        class="flex items-center gap-2 w-full px-3 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text-primary)] transition-colors"
      >
        <Plus size={16} />
        New Case Inquiry
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-2">
      <div
        class="px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 mt-2"
      >
        Saved Conversations
      </div>

      {#if $sidebarCases.length === 0}
        <div class="px-2 py-2 text-xs text-[var(--color-text-muted)]">
          Conversations appear here after the first streamed response.
        </div>
      {:else}
        <div class="px-2 pb-2 text-[11px] text-[var(--color-text-muted)]">
          Right-click a chat to delete it.
        </div>
        <div class="space-y-1">
          {#each $sidebarCases as item (item.id)}
            <button
              type="button"
              onclick={() => openCase(item.id)}
              oncontextmenu={(e) => openContextMenu(e, item.id, item.name)}
              class="block w-full px-3 py-2 rounded-md border text-sm transition-colors {item.id ===
              $activeCaseId
                ? 'bg-[var(--color-bg-tertiary)] border-[var(--color-accent-muted)] text-[var(--color-text-primary)]'
                : 'bg-transparent border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]'}"
            >
              <div class="truncate">{item.name}</div>
            </button>
          {/each}
        </div>
      {/if}
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

  {#if contextMenu}
    <div
      class="fixed z-[120] min-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-xl p-1"
      style="top: {contextMenu.y}px; left: {contextMenu.x}px;"
    >
      <button
        class="w-full text-left px-3 py-2 text-sm rounded hover:bg-red-500/15 text-red-400"
        onclick={() => contextMenu?.caseId && deleteCase(contextMenu.caseId)}
      >
        Delete Chat
      </button>
    </div>
  {/if}

  <!-- Main content area -->
  <main class="flex-1 bg-[var(--color-bg-primary)] h-full overflow-hidden">
    {@render children()}
  </main>
</div>
