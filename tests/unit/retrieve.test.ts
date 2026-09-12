import { describe, it, expect } from 'vitest'
import { retrieve } from '@/lib/corpus/retrieve'

describe('retrieve', () => {
  it('resolves a direct section reference exactly and pins it first', () => {
    const result = retrieve('What does section 302 IPC say?')
    expect(result.abstain).toBe(false)
    expect(result.sections[0]?.id).toBe('ipc:302')
    expect(result.sections[0]?.matchType).toBe('exact')
  })

  it('resolves a bare "IPC 420" reference', () => {
    const result = retrieve('IPC 420')
    const ids = result.sections.map((s) => s.id)
    expect(ids).toContain('ipc:420')
    expect(result.sections[0]?.matchType).toBe('exact')
  })

  it('finds the murder provision for a lexical query naming BNS', () => {
    const result = retrieve('What is the punishment for murder under the BNS?')
    expect(result.abstain).toBe(false)
    const ids = result.sections.map((s) => s.id)
    expect(ids).toContain('bns:103')
  })

  it('abstains on an out-of-corpus question', () => {
    const result = retrieve('What are the current GST rates on textiles?')
    expect(result.abstain).toBe(true)
    expect(result.coverage).toBeLessThan(0.34)
  })

  it('does not abstain simply because the corpus is small', () => {
    const result = retrieve('criminal breach of trust')
    expect(result.abstain).toBe(false)
    expect(result.sections.length).toBeGreaterThan(0)
  })

  it('does not abstain when the question names an act and adds filler words', () => {
    const result = retrieve('What is the punishment for cheating under the BNS?')
    expect(result.abstain).toBe(false)
    const ids = result.sections.map((s) => s.id)
    expect(ids).toContain('bns:318')
  })

  it('does not abstain on a definition question naming the full act', () => {
    const result = retrieve('How is murder defined in the Indian Penal Code?')
    expect(result.abstain).toBe(false)
    expect(result.sections.map((s) => s.id)).toContain('ipc:300')
  })

  it('does not abstain on a Constitution article question', () => {
    const result = retrieve('What does Article 21 of the Constitution protect?')
    expect(result.abstain).toBe(false)
    expect(result.sections[0]?.id).toBe('constitution:21')
    expect(result.sections[0]?.matchType).toBe('exact')
  })

  it('ranks a short section whose title the question names verbatim', () => {
    const result = retrieve('How is theft defined and punished under the BNS?')
    const ids = result.sections.map((s) => s.id)
    expect(ids, `got: ${ids.join(', ')}`).toContain('bns:303')
  })

  it('boosts a section whose title contains a contiguous phrase from the question', () => {
    const result = retrieve('What is the punishment for criminal breach of trust?')
    const ids = result.sections.map((s) => s.id)
    expect(ids, `got: ${ids.join(', ')}`).toContain('bns:316')
  })

  it('scopes retrieval to the named act so cross-act lookalikes do not outrank it', () => {
    const result = retrieve('What is the punishment for cheating under the BNS?')
    const ids = result.sections.map((s) => s.id)
    expect(ids, `got: ${ids.join(', ')}`).toContain('bns:318')
    expect(ids.some((id) => id.startsWith('ipc:'))).toBe(false)
  })
})
