import { describe, it, expect } from 'vitest'
import { parseCitations } from '@/lib/citations/format'

describe('parseCitations', () => {
  it('parses a well-formed citation and rewrites it to a marker', () => {
    const answer =
      'Murder is punishable. [[IPC s.302 | "Whoever commits murder shall be punished with death"]]'
    const { citations, answerWithMarkers } = parseCitations(answer)
    expect(citations).toHaveLength(1)
    expect(citations[0]).toMatchObject({ actName: 'IPC', number: '302' })
    expect(citations[0]!.quote).toContain('Whoever commits murder')
    expect(answerWithMarkers).toContain('[[1]]')
    expect(answerWithMarkers).not.toContain('IPC s.302')
  })

  it('handles suffixed section numbers like 304B', () => {
    const { citations } = parseCitations('[[IPC s.304B | "Dowry death"]]')
    expect(citations[0]?.number).toBe('304B')
  })

  it('handles long act names', () => {
    const { citations } = parseCitations(
      '[[Indian Contract Act s.10 | "All agreements are contracts"]]',
    )
    expect(citations[0]?.actName).toBe('Indian Contract Act')
  })

  it('ignores malformed tokens without throwing', () => {
    const { citations, answerWithMarkers } = parseCitations('[[IPC s.302 | no closing bracket')
    expect(citations).toHaveLength(0)
    expect(answerWithMarkers).toContain('[[IPC s.302')
  })
})
