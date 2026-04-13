<script lang="ts">
  import { Paperclip, Send, Scale, BookOpen, Clock, MessageSquarePlus, Square } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import ChatBubble from '$lib/components/inquiry/ChatBubble.svelte'
  import { timelineEvents, referencedLaws, crossQuestionContext } from '$lib/stores/workspace'
  import { env } from '$env/dynamic/public'

  let mode = $state<'lawyer' | 'client'>('lawyer')
  let inputText = $state('')

  let messages = $state<{ role: 'user' | 'assistant'; content: string }[]>([])
  let isStreaming = $state(false)
  let activeTab = $state<'laws' | 'timeline'>('laws')

  let abortController: AbortController | null = null

  // Cross-question selection state
  let selectionRect = $state<{ top: number; left: number } | null>(null)
  let selectionText = $state('')

  function handleSelection() {
    const selection = window.getSelection()
    if (selection && selection.toString().trim() && !selection.isCollapsed) {
      // Only if within a message
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      selectionRect = { top: rect.top - 40, left: rect.left + rect.width / 2 - 80 }
      selectionText = selection.toString().trim()
    } else {
      selectionRect = null
      selectionText = ''
    }
  }

  function startCrossQuestion() {
    $crossQuestionContext = selectionText
    selectionRect = null
    selectionText = ''
  }

  function removeCrossQuestion() {
    $crossQuestionContext = ''
  }

  function stopStreaming() {
    if (abortController) {
      abortController.abort()
      abortController = null
      isStreaming = false
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || isStreaming) return

    const query = inputText.trim()
    const crossContextText = $crossQuestionContext

    messages.push({ role: 'user', content: query })
    messages.push({ role: 'assistant', content: '' })
    inputText = ''
    $crossQuestionContext = '' // clear upon send
    selectionRect = null
    window.getSelection()?.removeAllRanges()

    isStreaming = true
    const apiUrl = env.PUBLIC_API_URL ?? 'http://localhost:8787'

    abortController = new AbortController()

    try {
      const res = await fetch(`${apiUrl}/inquiries/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: abortController.signal,
        body: JSON.stringify({
          question: query,
          documentIds: [],
          mode,
          crossQuestionContext: crossContextText || undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.details || body.error || 'API Error')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          messages[messages.length - 1].content += chunk

          // Optimistically check for timeline events in the running string
          const fullText = messages[messages.length - 1].content
          const dataMatch = fullText.match(/<data>([\s\S]*?)<\/data>/)
          if (dataMatch) {
            try {
              const json = JSON.parse(dataMatch[1])
              if (json.timeline) {
                $timelineEvents = json.timeline
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Stream aborted manually by user.')
      } else {
        messages[messages.length - 1].content +=
          `\n\n**Connection failed:** ${e.message || 'There was an error communicating with the backend.'}`
      }
    } finally {
      isStreaming = false
      abortController = null
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
</script>

<svelte:window onmouseup={handleSelection} />

<svelte:head>
  <title>PatraSaar Intelligence</title>
</svelte:head>

{#if selectionRect}
  <button
    class="fixed z-50 bg-[var(--color-bg-secondary)] border border-[var(--color-accent)] text-[var(--color-accent)] shadow-lg px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 hover:bg-[var(--color-accent)] hover:text-white transition-colors"
    style="top: {selectionRect.top}px; left: {selectionRect.left}px;"
    onclick={startCrossQuestion}
  >
    <MessageSquarePlus size={14} /> Cross-Question
  </button>
{/if}

<!-- The chat workspace with Center and Right panels -->
<div class="flex h-full">
  <!-- Center Area: Chat Space -->
  <div
    class="flex-1 flex flex-col h-full bg-[var(--color-bg-primary)] border-r border-[var(--color-border)] relative"
  >
    <!-- Top toolbar/Mode Toggle -->
    <div
      class="h-14 border-b border-[var(--color-border)] flex items-center justify-between px-6 shrink-0 z-10 bg-[var(--color-bg-primary)]"
    >
      <div class="font-medium text-[var(--color-text-primary)] flex items-center gap-2">
        <span class="text-lg font-bold text-[var(--color-accent)] font-display">PatraSaar</span> Intelligence
      </div>
      <div
        class="flex p-1 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]"
      >
        <button
          class="px-4 py-1.5 rounded-md text-sm transition-colors {mode === 'lawyer'
            ? 'bg-[var(--color-border)] text-[var(--color-text-primary)] shadow-sm'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
          onclick={() => (mode = 'lawyer')}
        >
          Professional
        </button>
        <button
          class="px-4 py-1.5 rounded-md text-sm transition-colors {mode === 'client'
            ? 'bg-[var(--color-border)] text-[var(--color-text-primary)] shadow-sm'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
          onclick={() => (mode = 'client')}
        >
          General Public
        </button>
      </div>
    </div>

    <!-- Chat Messages Area -->
    <div class="flex-1 overflow-y-auto w-full flex flex-col">
      <div class="flex-1 max-w-4xl mx-auto w-full p-6 md:px-12 lg:px-24">
        {#if messages.length === 0}
          <!-- Mock initial empty state -->
          <div class="h-full flex flex-col items-center justify-center text-center">
            <div
              class="w-16 h-16 rounded-full bg-[var(--color-accent-glow)] flex items-center justify-center mb-6 border border-[var(--color-accent-muted)] shadow-[0_0_20px_rgba(249,115,22,0.1)]"
            >
              <Scale size={32} class="text-[var(--color-accent)]" />
            </div>
            <h2 class="text-2xl font-display font-medium text-[var(--color-text-primary)] mb-3">
              How can PatraSaar help?
            </h2>
            <p class="text-sm text-[var(--color-text-secondary)] mb-8">
              {mode === 'lawyer'
                ? 'Provide facts, analyze evidence, and cross-reference citations against Indian statutes.'
                : 'Ask legal questions, upload documents for analysis, and learn your rights in simple terms.'}
            </p>
          </div>
        {:else}
          <div class="py-6">
            {#each messages as msg}
              {#if !(isStreaming && msg.role === 'assistant' && msg.content === '')}
                <ChatBubble content={msg.content} role={msg.role} />
              {/if}
            {/each}
            {#if isStreaming}
              <div class="flex gap-4 mb-8 animate-pulse text-opacity-80">
                <div
                  class="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 mt-1 shadow-sm"
                >
                  <Scale size={20} class="text-[var(--color-accent)]" />
                </div>
                <div
                  class="relative w-full bg-[var(--color-bg-secondary)] rounded-3xl border border-[var(--color-border)] p-6 shadow-sm flex items-center"
                >
                  <div class="text-[var(--color-text-muted)] tracking-wide">
                    PatraSaar intelligence is working...
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <!-- Input Bar Area -->
    <div class="p-6 pt-2 w-full shrink-0 bg-transparent">
      <div class="max-w-4xl mx-auto">
        {#if $crossQuestionContext}
          <div
            class="mb-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg p-2.5 flex items-start gap-2 relative"
          >
            <div
              class="w-1 absolute left-2 top-2.5 bottom-2.5 bg-[var(--color-accent-muted)] rounded-full"
            ></div>
            <div class="pl-3 text-xs text-[var(--color-text-secondary)] italic truncate pr-8">
              <strong class="text-[var(--color-text-primary)] not-italic block mb-0.5"
                >Regarding:</strong
              >
              "{$crossQuestionContext}"
            </div>
            <button
              onclick={removeCrossQuestion}
              class="absolute top-2 right-2 p-1 text-[var(--color-text-muted)] hover:text-white rounded-full transition-colors"
              >&times;</button
            >
          </div>
        {/if}

        <div
          class="relative bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] overflow-hidden focus-within:border-[var(--color-accent-muted)] focus-within:ring-1 focus-within:ring-[var(--color-accent-muted)] transition-all shadow-sm"
        >
          <textarea
            bind:value={inputText}
            onkeydown={handleKeydown}
            class="w-full bg-transparent p-4 pb-2 min-h-[64px] max-h-48 resize-none outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-base leading-relaxed"
            placeholder={mode === 'lawyer'
              ? 'Detail the facts of the case...'
              : 'Tell me what happened...'}
            rows="1"
          ></textarea>

          <div class="flex items-center justify-between px-4 pb-3">
            <button
              class="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] rounded-full transition-colors flex items-center gap-2"
              title="Attach Files"
            >
              <Paperclip size={18} />
              <span class="text-xs font-medium">Attach Context</span>
            </button>
            {#if isStreaming}
              <button
                onclick={stopStreaming}
                class="p-2 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-full transition-colors"
                title="Stop generation"
              >
                <Square fill="currentColor" size={18} />
              </button>
            {:else}
              <button
                onclick={sendMessage}
                class="p-2 bg-[var(--color-accent)] hover:bg-[#d56213] text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!inputText.trim()}
              >
                <Send size={18} />
              </button>
            {/if}
          </div>
        </div>
        <div class="text-center mt-3 text-xs text-[var(--color-text-muted)]">
          PatraSaar Intelligence does not replace legal representation. All data resets per session.
        </div>
      </div>
    </div>
  </div>

  <!-- Right Panel: Live Legal Toolkit -->
  <aside
    class="w-[340px] bg-[var(--color-bg-secondary)] flex flex-col shrink-0 border-l border-[var(--color-border)]"
  >
    <div class="h-14 border-b border-[var(--color-border)] flex shrink-0">
      <button
        onclick={() => (activeTab = 'laws')}
        class="flex-1 flex items-center justify-center gap-2 {activeTab === 'laws'
          ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]'
          : 'border-b-2 border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'} font-medium text-sm transition-colors"
      >
        <BookOpen size={16} /> Laws
      </button>
      <button
        onclick={() => (activeTab = 'timeline')}
        class="flex-1 flex items-center justify-center gap-2 {activeTab === 'timeline'
          ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]'
          : 'border-b-2 border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'} font-medium text-sm transition-colors relative"
      >
        <Clock size={16} /> Timeline
        {#if $timelineEvents.length > 0}
          <div class="absolute top-3 right-6 w-2 h-2 bg-[var(--color-accent)] rounded-full"></div>
        {/if}
      </button>
    </div>
    <div class="flex-1 overflow-y-auto p-6">
      {#if activeTab === 'laws'}
        {#if $referencedLaws.length > 0}
          <div class="space-y-4">
            <h3
              class="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-4"
            >
              Referenced Act Sections
            </h3>
            {#each $referencedLaws as law}
              <a
                href="https://indiankanoon.org/search/?formInput={encodeURIComponent(
                  law.act + ' ' + law.section,
                )}"
                target="_blank"
                class="block p-4 border border-[var(--color-border)] bg-[var(--color-bg-primary)] rounded-xl hover:border-[var(--color-accent-muted)] transition-colors group"
              >
                <div class="flex flex-col gap-2">
                  <div>
                    <div
                      class="text-xs font-mono text-[var(--color-accent)] mb-1 inline-block bg-[var(--color-accent)]/10 px-2 py-0.5 rounded"
                    >
                      {law.act} Section {law.section}
                    </div>
                    <div
                      class="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors mt-1"
                    >
                      {law.display}
                    </div>
                  </div>
                  {#if law.description}
                    <div
                      class="text-[13px] text-[var(--color-text-secondary)] leading-relaxed border-t border-[var(--color-border)] pt-2 mt-1"
                    >
                      {law.description}
                    </div>
                  {/if}
                </div>
              </a>
            {/each}
          </div>
        {:else}
          <div
            class="text-center flex flex-col items-center justify-center h-fullopacity-60 text-sm text-[var(--color-text-muted)] mt-10"
          >
            Mentioned statutes and case laws will appear here automatically with summaries.
          </div>
        {/if}
      {/if}

      {#if activeTab === 'timeline'}
        {#if $timelineEvents.length > 0}
          <div class="relative pl-3 border-l border-[var(--color-border)] ml-2">
            {#each $timelineEvents as event}
              <div class="mb-6 relative">
                <div
                  class="absolute -left-4 w-2 h-2 rounded-full bg-[var(--color-accent)] top-1.5"
                ></div>
                <div
                  class="text-xs font-bold text-[var(--color-text-secondary)] mb-1 uppercase tracking-widest"
                >
                  {event.date}
                </div>
                <div
                  class="text-sm text-[var(--color-text-primary)] leading-relaxed bg-[var(--color-bg-primary)] p-3 rounded-lg border border-[var(--color-border)]"
                >
                  {event.event}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center text-sm text-[var(--color-text-muted)] mt-10">
            As you describe the situation, a visual chronological timeline of events will be built
            here automatically.
          </div>
        {/if}
      {/if}
    </div>
  </aside>
</div>
