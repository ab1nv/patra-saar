import rawMap from '../../../data/ipc-bns-map.json'
import { BM25 } from '../corpus/bm25'
import { allSections, getSectionByActNumber } from '../corpus/index'
import type { Section } from '../corpus/types'

export type MappingEntry = { ipc: string; bns: string; note?: string }
const MAPPINGS = (rawMap as { mappings: MappingEntry[] }).mappings

const byIpc = new Map<string, MappingEntry>()
const byBns = new Map<string, MappingEntry>()
for (const m of MAPPINGS) {
  if (!byIpc.has(m.ipc)) byIpc.set(m.ipc, m)
  if (!byBns.has(m.bns)) byBns.set(m.bns, m)
}

export type MigrateDirection = 'ipc->bns' | 'bns->ipc'

export type MigrateCandidate = { section: Section; score: number }

export type MigrateResult = {
  direction: MigrateDirection
  inputNumber: string
  inputFound: boolean
  source?: Section
  target?: Section
  verified: boolean
  note?: string
  /** Evidence-based suggestions when the input is not in the curated table. */
  candidates: MigrateCandidate[]
  curatedCount: number
}

const bnsSections = allSections().filter((s) => s.act === 'BNS')
const ipcSections = allSections().filter((s) => s.act === 'IPC')

let bnsIndex: BM25 | null = null
let ipcIndex: BM25 | null = null
function indexFor(act: 'BNS' | 'IPC'): BM25 {
  if (act === 'BNS') {
    if (!bnsIndex) bnsIndex = new BM25(bnsSections.map((s) => ({ id: s.id, tokens: s.tokens })))
    return bnsIndex
  }
  if (!ipcIndex) ipcIndex = new BM25(ipcSections.map((s) => ({ id: s.id, tokens: s.tokens })))
  return ipcIndex
}

export function migrate(direction: MigrateDirection, inputNumber: string): MigrateResult {
  const number = inputNumber.trim().toUpperCase()
  const source = getSectionByActNumber(direction === 'ipc->bns' ? 'IPC' : 'BNS', number)

  const curated = direction === 'ipc->bns' ? byIpc.get(number) : byBns.get(number)
  const targetNumber = curated ? (direction === 'ipc->bns' ? curated.bns : curated.ipc) : undefined
  const target = targetNumber
    ? getSectionByActNumber(direction === 'ipc->bns' ? 'BNS' : 'IPC', targetNumber)
    : undefined

  // Evidence-based suggestion when not curated (or curated target is missing).
  let candidates: MigrateCandidate[] = []
  if (!target && source) {
    const pool = direction === 'ipc->bns' ? bnsSections : ipcSections
    const byId = new Map(pool.map((s) => [s.id, s]))
    const hits = indexFor(direction === 'ipc->bns' ? 'BNS' : 'IPC').search(source.tokens, 3)
    candidates = hits
      .map((h) => {
        const section = byId.get(h.id)
        return section ? { section, score: h.score } : null
      })
      .filter((c): c is MigrateCandidate => c !== null)
  }

  return {
    direction,
    inputNumber: number,
    inputFound: Boolean(source),
    source: source ?? undefined,
    target: target ?? undefined,
    verified: Boolean(curated && source && target),
    note: curated?.note,
    candidates,
    curatedCount: MAPPINGS.length,
  }
}
