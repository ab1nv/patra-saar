import { describe, it, expect } from 'vitest'
import {
  assembleDualContext,
  buildDualSystemPrompt,
  type KbContextChunk,
  type UserContextChunk,
} from './dual-rag'

// ---------------------------------------------------------------------------
// assembleDualContext
// ---------------------------------------------------------------------------

describe('assembleDualContext', () => {
  const kbChunks: KbContextChunk[] = [
    {
      id: 'kb1',
      content: 'A lease of immoveable property is a transfer of a right to enjoy such property.',
      sectionRef: 'Section 105',
      sourceTitle: 'Transfer of Property Act, 1882',
      jurisdiction: 'central',
    },
    {
      id: 'kb2',
      content: 'No order for recovery of possession shall be made except on one or more grounds.',
      sectionRef: 'Section 14',
      sourceTitle: 'Delhi Rent Control Act, 1958',
      jurisdiction: 'delhi',
    },
  ]

  const userChunks: UserContextChunk[] = [
    {
      id: 'doc1',
      content: 'The tenancy shall commence on 1st January 2026 for a period of 11 months.',
      sectionRef: 'Clause 1',
      documentId: 'doc_abc',
    },
    {
      id: 'doc2',
      content: 'The landlord may revise the rent annually at their sole discretion.',
      sectionRef: 'Clause 7',
      documentId: 'doc_abc',
    },
  ]

  it('produces KB section header', () => {
    const result = assembleDualContext(kbChunks, userChunks)
    expect(result).toContain('KNOWLEDGE BASE')
  })

  it('produces USER DOCUMENT section header', () => {
    const result = assembleDualContext(kbChunks, userChunks)
    expect(result).toContain("USER'S DOCUMENT")
  })

  it('labels KB chunks as [KB-1], [KB-2]...', () => {
    const result = assembleDualContext(kbChunks, userChunks)
    expect(result).toContain('[KB-1]')
    expect(result).toContain('[KB-2]')
  })

  it('labels user doc chunks as [DOC-1], [DOC-2]...', () => {
    const result = assembleDualContext(kbChunks, userChunks)
    expect(result).toContain('[DOC-1]')
    expect(result).toContain('[DOC-2]')
  })

  it('includes source title and section ref in KB chunks', () => {
    const result = assembleDualContext(kbChunks, userChunks)
    expect(result).toContain('Transfer of Property Act, 1882')
    expect(result).toContain('Section 105')
  })

  it('includes section ref in user doc chunks', () => {
    const result = assembleDualContext(kbChunks, userChunks)
    expect(result).toContain('Clause 1')
    expect(result).toContain('Clause 7')
  })

  it('includes chunk content', () => {
    const result = assembleDualContext(kbChunks, userChunks)
    expect(result).toContain('A lease of immoveable property')
    expect(result).toContain('annually at their sole discretion')
  })

  it('KB-only mode when no user chunks', () => {
    const result = assembleDualContext(kbChunks, [])
    expect(result).toContain('[KB-1]')
    expect(result).not.toContain('[DOC-')
    expect(result).toContain('No document uploaded')
  })

  it('user-only mode when no KB chunks', () => {
    const result = assembleDualContext([], userChunks)
    expect(result).not.toContain('[KB-')
    expect(result).toContain('[DOC-1]')
    expect(result).toContain('No relevant legal provisions found')
  })

  it('empty string when both empty', () => {
    const result = assembleDualContext([], [])
    expect(result).toBeTruthy() // still returns guidance string
    expect(result).toContain('No context available')
  })
})

// ---------------------------------------------------------------------------
// buildDualSystemPrompt
// ---------------------------------------------------------------------------

describe('buildDualSystemPrompt', () => {
  it('includes category name', () => {
    const prompt = buildDualSystemPrompt('Rental & Tenancy Law', null, true)
    expect(prompt).toContain('Rental & Tenancy Law')
  })

  it('includes jurisdiction when provided', () => {
    const prompt = buildDualSystemPrompt('Rental & Tenancy Law', 'Delhi', true)
    expect(prompt).toContain('Delhi')
  })

  it('omits jurisdiction line when null', () => {
    const prompt = buildDualSystemPrompt('Rental & Tenancy Law', null, true)
    expect(prompt).not.toContain('Jurisdiction:')
  })

  it('includes document-uploaded instruction when hasDocument true', () => {
    const prompt = buildDualSystemPrompt('Rental & Tenancy Law', null, true)
    expect(prompt).toContain('[DOC-')
  })

  it('includes no-document instruction when hasDocument false', () => {
    const prompt = buildDualSystemPrompt('Rental & Tenancy Law', null, false)
    expect(prompt).toContain('not uploaded')
  })

  it('instructs to cite KB refs as [KB-N]', () => {
    const prompt = buildDualSystemPrompt('Rental & Tenancy Law', null, true)
    expect(prompt).toContain('[KB-N]')
  })

  it('instructs to cite doc refs as [DOC-N]', () => {
    const prompt = buildDualSystemPrompt('Rental & Tenancy Law', null, true)
    expect(prompt).toContain('[DOC-N]')
  })

  it('ends with legal disclaimer instruction', () => {
    const prompt = buildDualSystemPrompt('Rental & Tenancy Law', null, true)
    expect(prompt).toContain('not legal advice')
  })
})
