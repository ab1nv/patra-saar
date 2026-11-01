import { describe, it, expect } from 'vitest'
import { retrieve, retrieveSync } from '@/lib/corpus/retrieve'

describe('retrieve (hybrid dense + sparse RRF)', () => {
  it('resolves a direct section reference exactly and pins it first', async () => {
    const result = await retrieve('What does section 302 IPC say?')
    expect(result.abstain).toBe(false)
    expect(result.sections[0]?.id).toBe('ipc:302')
    expect(result.sections[0]?.matchType).toBe('exact')
  })

  it('resolves a bare "IPC 420" reference', async () => {
    const result = await retrieve('IPC 420')
    const ids = result.sections.map((s) => s.id)
    expect(ids).toContain('ipc:420')
    expect(result.sections[0]?.matchType).toBe('exact')
  })

  it('resolves section 138 of the NI Act exactly', async () => {
    const result = await retrieve('What is the punishment under section 138 of the NI Act?')
    expect(result.abstain).toBe(false)
    expect(result.sections[0]?.id).toBe('ni:138')
    expect(result.sections[0]?.matchType).toBe('exact')
  })

  it('resolves DPDP section queries', async () => {
    const result = await retrieve(
      'What are the grounds for processing under section 4 of the DPDP Act?',
    )
    expect(result.abstain).toBe(false)
    expect(result.sections[0]?.id).toBe('dpdp:4')
  })

  it('resolves Limitation Act queries', async () => {
    const result = await retrieve('What is section 5 of the Limitation Act?')
    expect(result.abstain).toBe(false)
    expect(result.sections[0]?.id).toBe('limitation:5')
  })

  it('resolves Arbitration Act queries', async () => {
    const result = await retrieve('What is section 8 of the Arbitration Act?')
    expect(result.abstain).toBe(false)
    expect(result.sections[0]?.id).toBe('arbitration:8')
  })

  it('resolves Specific Relief Act queries', async () => {
    const result = await retrieve('What is section 10 of the Specific Relief Act?')
    expect(result.abstain).toBe(false)
    expect(result.sections[0]?.id).toBe('specific-relief:10')
  })

  it('uses dense embeddings to bridge colloquial vocabulary for theft', async () => {
    // "stealing a mobile phone" has no token overlap with "dishonestly taking movable property"
    const result = await retrieve('stealing a mobile phone')
    expect(result.abstain).toBe(false)
    const ids = result.sections.map((s) => s.id)
    // Should retrieve theft/stolen property provisions (e.g. bns:303, bns:304, it:66B, ipc:378)
    const hasTheftProvision = ids.some((id) =>
      ['bns:303', 'bns:304', 'it:66B', 'ipc:378', 'ipc:379'].includes(id),
    )
    expect(hasTheftProvision).toBe(true)
  })

  it('uses dense embeddings for colloquial cheque bounce queries', async () => {
    const result = await retrieve('cheque returned unpaid due to low balance')
    expect(result.abstain).toBe(false)
    const ids = result.sections.map((s) => s.id)
    expect(ids).toContain('ni:138')
  })

  it('finds the murder provision for a query naming BNS', async () => {
    const result = await retrieve('What is the punishment for murder under the BNS?')
    expect(result.abstain).toBe(false)
    const ids = result.sections.map((s) => s.id)
    expect(ids).toContain('bns:103')
  })

  it('abstains on an out-of-corpus question', async () => {
    const result = await retrieve('What are the current GST rates on textiles?')
    expect(result.abstain).toBe(true)
  })

  it('does not abstain on a Constitution article question', async () => {
    const result = await retrieve('What does Article 21 of the Constitution protect?')
    expect(result.abstain).toBe(false)
    expect(result.sections[0]?.id).toBe('constitution:21')
    expect(result.sections[0]?.matchType).toBe('exact')
  })

  it('synchronous retrieveSync fallback works for pure BM25', () => {
    const result = retrieveSync('criminal breach of trust')
    expect(result.abstain).toBe(false)
    expect(result.sections.length).toBeGreaterThan(0)
  })
})
