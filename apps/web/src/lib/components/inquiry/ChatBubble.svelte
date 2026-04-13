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

    // forcefully fix missing markdown headers for the strict sections
    clean = clean.replace(
      /^(Case Summary|Applicable Laws & Potential Charges|Actionable Next Steps)\s*$/gm,
      '## $1',
    )

    // fix spaces in law: links so marked.js can parse them properly
    clean = clean.replace(/\[([^\]]+)\]\(law:([^)]+)\)/g, (match, text, href) => {
      // url encode spaces to avoid breaking markdown parsers
      return `[${text}](law:${href.replace(/\s+/g, '%20')})`
    })

    return clean
  })

  let htmlContent = $derived(marked.parse(displayContent))

  let bubbleref: HTMLDivElement | null = $state(null)

  $effect(() => {
    if (!bubbleref || role !== 'assistant' || !content) return
    const links = bubbleref.querySelectorAll('a[href^="law:"]')
    links.forEach((link) => {
      const href = link.getAttribute('href')!
      const parts = href.split(':')
      const act = parts[1]
      const section = parts[2]
      const description = parts.length > 3 ? decodeURIComponent(parts.slice(3).join(':')) : ''

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
          'px-1',
          'rounded',
        )
        // Set tooltip to be the description if exists, else generic
        link.setAttribute('title', description || `Reference: ${act} Section ${section}`)
        link.addEventListener('click', (e) => e.preventDefault())
      }

      referencedLaws.update((laws) => {
        const exists = laws.some((l) => l.act === act && l.section === section)
        if (!exists) {
          return [
            ...laws,
            { display: link.textContent || `${act} ${section}`, act, section, description },
          ]
        }
        return laws
      })
    })
  })
</script>

<div class="flex gap-4 mb-12 {role === 'user' ? 'justify-end' : ''}">
  {#if role === 'assistant'}
    <div
      class="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 mt-1 shadow-sm"
    >
      <Scale size={20} class="text-[var(--color-accent)]" />
    </div>
  {/if}

  <div
    bind:this={bubbleref}
    class="relative rounded-3xl {role === 'user'
      ? 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] px-6 py-4 max-w-[80%]'
      : 'w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-6 md:p-8 shadow-sm'}"
  >
    {#if role === 'assistant'}
      <div
        class="prose prose-invert max-w-none prose-headings:font-display prose-headings:font-semibold prose-a:no-underline prose-h2:text-3xl prose-h2:text-[var(--color-accent)] prose-h2:border-b prose-h2:border-[var(--color-border)] prose-h2:pb-4 prose-h2:mb-6 prose-p:text-[var(--color-text-primary)] prose-strong:text-orange-300 prose-ul:text-[var(--color-text-secondary)] prose-li:marker:text-[var(--color-accent)]"
      >
        {@html htmlContent}
      </div>
    {:else}
      <p class="whitespace-pre-wrap m-0 text-base">{content}</p>
    {/if}
  </div>
</div>
