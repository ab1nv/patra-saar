/**
 * Builds data/corpus.json from the source bare-act PDFs in data/acts/.
 *
 * Strategy: Indian bare acts are structured as `NUMBER. Title.—Body`.
 * We split on that heading pattern, requiring the em/en dash separator so
 * the front-matter "ARRANGEMENT OF SECTIONS" table of contents (which has no
 * dash) is skipped. Footnotes are rejected structurally (they contain an
 * internal ". " that real short titles do not) and by de-duplicating on
 * section number.
 *
 * Run: pnpm corpus:build
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { extractText, getDocumentProxy } from 'unpdf'
import type { Corpus, Section } from '../src/lib/corpus/types'

type ActConfig = {
  act: string
  slug: string
  actFull: string
  file: string
  expected: number
}

const ACTS: ActConfig[] = [
  {
    act: 'IPC',
    slug: 'ipc',
    actFull: 'Indian Penal Code, 1860',
    file: 'THE INDIAN PENAL CODE.pdf',
    expected: 511,
  },
  {
    act: 'BNS',
    slug: 'bns',
    actFull: 'Bharatiya Nyaya Sanhita, 2023',
    file: 'The Bharatiya Nyaya Sanhita, 2023.pdf',
    expected: 358,
  },
  {
    act: 'Contract Act',
    slug: 'contract',
    actFull: 'Indian Contract Act, 1872',
    file: 'THE INDIAN CONTRACT ACT, 1872.pdf',
    expected: 238,
  },
  {
    act: 'IT Act',
    slug: 'it',
    actFull: 'Information Technology Act, 2000',
    file: 'THE INFORMATION TECHNOLOGY ACT, 2000.pdf',
    expected: 94,
  },
  {
    act: 'Companies Act',
    slug: 'companies',
    actFull: 'Companies Act, 2013',
    file: 'THE COMPANIES ACT, 2013.pdf',
    expected: 470,
  },
  {
    act: 'BSA',
    slug: 'bsa',
    actFull: 'Bharatiya Sakshya Adhiniyam, 2023',
    file: 'he Bharatiya Sakshya Adhiniyam, 2023.pdf',
    expected: 170,
  },
]

const SECTION_RE = /^[ \t]*(\d{1,3}[A-Z]{0,2})\.\s+([\s\S]{3,140}?)\s*[—–]{1,2}\s*/gm

/** Remove page furniture and chapter/all-caps headings that corrupt section text. */
function cleanText(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .filter((line) => {
      const l = line.trim()
      if (!l) return false
      if (/^\d{1,3}$/.test(l)) return false // standalone page number
      if (/^_{3,}$/.test(l)) return false
      if (/^SECTIONS$/i.test(l)) return false
      if (/^ARRANGEMENT OF SECTIONS$/i.test(l)) return false
      if (/^CHAPTER\b/i.test(l)) return false
      // all-caps act titles / chapter names
      if (l.length >= 4 && l.length <= 70 && /^[A-Z0-9 ,.\-'’&()]+$/.test(l)) return false
      return true
    })
    .join('\n')
}

function isFootnoteTitle(title: string): boolean {
  // Real section titles never contain an internal ". " (footnote spans do).
  if (/\.\s/.test(title)) return true
  if (/(^|\s)(Subs|Ins|Omitted|Added|Repealed|Renumbered|Substituted|ibid)\b/i.test(title))
    return true
  if (/\(w\.e\.f|with effect from/i.test(title)) return true
  return false
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** Unwrap footnote/amendment markers so quotes are naturally verbatim. */
function normalizeBody(body: string): string {
  return body
    .replace(/\d+\[([^\]]*)\]/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

async function extractTextFor(file: string): Promise<string> {
  const buf = readFileSync(path.join('data', 'acts', file))
  const pdf = await getDocumentProxy(new Uint8Array(buf))
  const { text } = await extractText(pdf, { mergePages: false })
  return cleanText((text as string[]).join('\n'))
}

async function parseAct(cfg: ActConfig): Promise<Section[]> {
  const text = await extractTextFor(cfg.file)
  const candidates = [...text.matchAll(SECTION_RE)].map((m) => ({
    num: m[1]!,
    titleRaw: m[2]!.replace(/\s+/g, ' ').trim(),
    start: m.index!,
    end: m.index! + m[0].length,
  }))

  // keep real sections, de-duplicating on number (first wins)
  const seen = new Set<string>()
  const kept: typeof candidates = []
  for (const c of candidates) {
    const title = c.titleRaw.replace(/[.\s]+$/, '').trim()
    if (title.length < 3) continue
    if (isFootnoteTitle(c.titleRaw)) continue
    if (seen.has(c.num)) continue
    seen.add(c.num)
    kept.push({ ...c, titleRaw: title })
  }

  const sections: Section[] = []
  for (let i = 0; i < kept.length; i++) {
    const cur = kept[i]!
    const next = kept[i + 1]
    const body = normalizeBody(text.slice(cur.end, next ? next.start : text.length))
    if (body.length < 15) continue // repealed / empty sections carry no corpus value
    sections.push({
      id: `${cfg.slug}:${cur.num}`,
      act: cfg.act,
      actFull: cfg.actFull,
      number: cur.num,
      title: cur.titleRaw,
      text: body.replace(/\n{2,}/g, '\n').trim(),
      // title is repeated to give it a ~3x BM25 weight over body text
      tokens: tokenize(`${cur.titleRaw} ${cur.titleRaw} ${cur.titleRaw} ${body}`),
      parseQuality: 'sectioned',
    })
  }
  return sections
}

async function main() {
  const all: Section[] = []
  const report: Corpus['acts'] = []

  for (const cfg of ACTS) {
    if (!readdirSync(path.join('data', 'acts')).includes(cfg.file)) {
      console.warn(`  ! missing source file: ${cfg.file}`)
      continue
    }
    const sections = await parseAct(cfg)
    all.push(...sections)
    report.push({
      act: cfg.act,
      actFull: cfg.actFull,
      sectionCount: sections.length,
      sourceFile: cfg.file,
      parseQuality: 'sectioned',
    })
    const pct = Math.round((sections.length / cfg.expected) * 100)
    console.log(
      `  ${cfg.act.padEnd(15)} ${String(sections.length).padStart(4)} sections-with-text  (~${pct}% of ${cfg.expected} nominal)`,
    )
  }

  const corpus: Corpus = {
    builtAt: new Date().toISOString(),
    acts: report,
    sections: all,
  }

  const out = path.join('data', 'corpus.json')
  writeFileSync(out, JSON.stringify(corpus))
  const bytes = readFileSync(out).byteLength
  console.log(`\nWrote ${out}: ${all.length} sections, ${(bytes / 1024 / 1024).toFixed(2)} MB`)

  // Spot-check the sections the tests and demo rely on.
  const spots = [
    'ipc:302',
    'ipc:420',
    'ipc:406',
    'bns:103',
    'contract:10',
    'it:66',
    'companies:2',
    'bsa:3',
  ]
  console.log('\nSpot checks:')
  for (const id of spots) {
    const s = all.find((x) => x.id === id)
    console.log(`  ${id.padEnd(14)} ${s ? `"${s.title}" (${s.text.length} chars)` : 'MISSING'}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
