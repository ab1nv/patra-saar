<script lang="ts">
  import { marked } from 'marked'
  import { referencedLaws } from '$lib/stores/workspace'
  import { Scale } from 'lucide-svelte'

  let { content, role } = $props<{ content: string; role: 'user' | 'assistant' }>()

  let displayContent = $derived.by(() => {
    let clean = content
    const dataMatch = clean.match(/<data>([\s\S]*?)<\/data>/)
    if (dataMatch) {
      clean = clean.replace(dataMatch[0], '')
    }
    return clean
  })

  let htmlContent = $derived(marked.parse(displayContent))

  let bubbleref: HTMLDivElement | null = $state(null)

  $effect(() => {
    if (!bubbleref || role !== 'assistant' || !content) return
    const links = bubbleref.querySelectorAll('a[href^="law:"]')
    links.forEach((link) => {
      const href = link.getAttribute('href')!
      const [_, act, section] = href.split(':')

      if (!link.classList.contains('law-term-hover')) {
        link.classList.add(
          'law-term-hover',
          'text-[var(--color-accent)]',
          'font-medium',
          'underline',
          'decoration-dashed',
          'decoration-[var(--color-accent-muted)]',
          'cursor-help',
          'relative',
          'underline-offset-4',
        )
        link.setAttribute('title', `Reference: ${act} Section ${section}`)
        link.addEventListener('click', (e) => e.preventDefault())
      }

      referencedLaws.update((laws) => {
        const exists = laws.some((l) => l.act === act && l.section === section)
        if (!exists) {
          return [...laws, { display: link.textContent || `${act} ${section}`, act, section }]
        }
        return laws
      })
    })
  })
</script>

<div class="flex gap-4 mb-8 {role === 'user' ? 'justify-end' : ''}">
  {#if role === 'assistant'}
    <div
      class="w-8 h-8 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 mt-1"
    >
      <Scale size={16} class="text-[var(--color-accent)]" />
    </div>
  {/if}

  <div
    bind:this={bubbleref}
    class="relative rounded-2xl {role === 'user'
      ? 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] px-5 py-3 max-w-[80%]'
      : 'w-full'}"
  >
    {#if role === 'assistant'}
      <div
        class="prose prose-invert prose-orange max-w-none prose-headings:font-display prose-headings:font-medium prose-a:no-underline"
      >
        {@html htmlContent}
      </div>
    {:else}
      <p class="whitespace-pre-wrap m-0 text-[15px]">{content}</p>
    {/if}
  </div>
</div>
