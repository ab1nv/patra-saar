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
})
