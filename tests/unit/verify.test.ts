import { describe, it, expect } from 'vitest'
import { retrieveSync } from '@/lib/corpus/retrieve'
import { verifyCitations } from '@/lib/citations/verify'

/** The verification layer is the project's claim, so this is its thesis test. */
describe('verifyCitations', () => {
  const retrieved = retrieveSync('section 302 IPC').sections
  const ipc302 = retrieved.find((s) => s.id === 'ipc:302')!

  it('verifies a citation whose quote is verbatim from the retrieved section', () => {
    const answer = `[[IPC s.302 | "Whoever commits murder shall be punished with death or imprisonment for life"]]`
    const result = verifyCitations(answer, retrieved)
    expect(result.citations[0]?.verified).toBe(true)
    expect(result.verifiedCount).toBe(1)
    expect(result.unverifiedCount).toBe(0)
    expect(result.citations[0]?.title).toBe('Punishment for murder')
  })

  it('fails a citation for a section that does not exist in the corpus', () => {
    const result = verifyCitations(`[[IPC s.999 | "some invented provision text"]]`, retrieved)
    expect(result.citations[0]?.verified).toBe(false)
    expect(result.citations[0]?.failureReason).toBe('section_not_found')
  })

  it('fails a real section that was not retrieved for this query', () => {
    const result = verifyCitations(
      `[[IPC s.420 | "Whoever cheats and thereby dishonestly induces the person deceived"]]`,
      retrieved,
    )
    expect(result.citations[0]?.verified).toBe(false)
    expect(result.citations[0]?.failureReason).toBe('not_retrieved')
  })

  it('fails a PARAPHRASED quote even when the section is real and retrieved', () => {
    const answer = `[[IPC s.302 | "Any person who commits murder will receive capital punishment"]]`
    const result = verifyCitations(answer, retrieved)
    expect(result.citations[0]?.verified).toBe(false)
    expect(result.citations[0]?.failureReason).toBe('quote_not_verbatim')
  })

  it('exposes the real section text for the verified drawer', () => {
    const answer = `[[IPC s.302 | "${ipc302.text.slice(0, 40)}"]]`
    const result = verifyCitations(answer, retrieved)
    expect(result.citations[0]?.verified).toBe(true)
    expect(result.citations[0]?.sectionText).toBe(ipc302.text)
  })

  it('resolves a citation that uses the full act name with a year', () => {
    const bnsRetrieved = retrieveSync('section 103 BNS').sections
    const bns103 = bnsRetrieved.find((s) => s.id === 'bns:103')!
    const answer = `[[Bharatiya Nyaya Sanhita, 2023 s.103 | "${bns103.text.slice(0, 50)}"]]`
    const result = verifyCitations(answer, bnsRetrieved)
    expect(result.citations[0]?.sectionId).toBe('bns:103')
    expect(result.citations[0]?.verified).toBe(true)
  })

  it('does not throw on malformed citation syntax', () => {
    const result = verifyCitations('[[IPC s.302 | unterminated', retrieved)
    expect(result.citations).toHaveLength(0)
  })

  it('verifies a citation from newly ingested acts like NI Act 138', () => {
    const niRetrieved = retrieveSync('section 138 NI Act').sections
    const ni138 = niRetrieved.find((s) => s.id === 'ni:138')!
    expect(ni138).toBeDefined()
    const quote = 'Where any cheque drawn by a person on an account maintained by him'
    const answer = `[[NI Act s.138 | "${quote}"]]`
    const result = verifyCitations(answer, niRetrieved)
    expect(result.citations[0]?.verified).toBe(true)
    expect(result.citations[0]?.sectionId).toBe('ni:138')
  })
})
