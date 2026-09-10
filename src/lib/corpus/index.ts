import type { Corpus, Section } from './types'
import raw from '../../../data/corpus.json'

/**
 * Loads the committed corpus once at module scope (warm across requests in the
 * same serverless instance) and exposes an O(1) exact-section lookup plus the
 * full section list for BM25 indexing.
 */
const corpus = raw as unknown as Corpus

const byId = new Map<string, Section>()
for (const s of corpus.sections) byId.set(s.id, s)

/** Maps act names/aliases appearing in questions to corpus slugs. */
const ACT_ALIASES: Record<string, string> = {
  ipc: 'ipc',
  'indian penal code': 'ipc',
  'penal code': 'ipc',
  bns: 'bns',
  'bharatiya nyaya sanhita': 'bns',
  'nyaya sanhita': 'bns',
  contract: 'contract',
  'contract act': 'contract',
  'indian contract act': 'contract',
  it: 'it',
  'it act': 'it',
  'information technology act': 'it',
  companies: 'companies',
  'companies act': 'companies',
  bsa: 'bsa',
  'bharatiya sakshya adhiniyam': 'bsa',
  'sakshya adhiniyam': 'bsa',
  'evidence act': 'bsa',
}

export function actSlugFromName(name: string): string | undefined {
  const n = name.trim().toLowerCase()
  if (ACT_ALIASES[n]) return ACT_ALIASES[n]

  // Normalize: drop punctuation and years, then try exact / substring alias match.
  const compact = n
    .replace(/[^a-z ]/g, ' ')
    .replace(/\b(?:18|19|20)\d{2}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (ACT_ALIASES[compact]) return ACT_ALIASES[compact]

  const aliases = Object.keys(ACT_ALIASES).sort((a, b) => b.length - a.length)
  for (const alias of aliases) {
    if (compact.includes(alias)) return ACT_ALIASES[alias]
  }
  return undefined
}

export function getSection(id: string): Section | undefined {
  return byId.get(id)
}

export function getSectionByActNumber(act: string, number: string): Section | undefined {
  const slug = actSlugFromName(act) ?? act.trim().toLowerCase()
  return byId.get(`${slug}:${normalizeSectionNumber(number)}`)
}

/** all Sections whose number matches, across every act (used when no act is named). */
export function getSectionsByNumber(number: string): Section[] {
  const n = normalizeSectionNumber(number)
  const out: Section[] = []
  for (const s of corpus.sections) if (s.number === n) out.push(s)
  return out
}

export function normalizeSectionNumber(number: string): string {
  return number
    .trim()
    .toUpperCase()
    .replace(/^0+(?=\d)/, '')
}

export function allSections(): Section[] {
  return corpus.sections
}

export function corpusMeta(): { builtAt: string; acts: Corpus['acts']; sectionCount: number } {
  return { builtAt: corpus.builtAt, acts: corpus.acts, sectionCount: corpus.sections.length }
}
