import { describe, it, expect } from 'vitest'
import { scoreAnswer, summarize, type QuestionResult } from '@/lib/audit/score'
import { getSection } from '@/lib/corpus'

describe('audit scoring', () => {
  it('flags a citation to a section that does not exist as fabricated', () => {
    const result = scoreAnswer({
      answer: '[[IPC s.991 | "Whoever commits cyber defamation shall be punished"]]',
    })
    expect(result.citationCount).toBe(1)
    expect(result.fabricatedCount).toBe(1)
    expect(result.existsCount).toBe(0)
  })

  it('recognises a real section with a verbatim quote', () => {
    const section = getSection('ipc:302')!
    const quote = section.text.split('\n')[0]!.slice(0, 50).trim()
    const result = scoreAnswer({ answer: `[[IPC s.302 | "${quote}"]]` })
    expect(result.existsCount).toBe(1)
    expect(result.verbatimCount).toBe(1)
  })

  it('records correctness against the expected section', () => {
    const section = getSection('bns:103')!
    const quote = section.text.slice(0, 60)
    const result = scoreAnswer({
      answer: `[[BNS s.103 | "${quote}"]]`,
      expectedSectionId: 'bns:103',
    })
    expect(result.correctCount).toBe(1)
  })

  it('treats an answer with no citations as abstention', () => {
    const result = scoreAnswer({ answer: 'I do not have that provision.' })
    expect(result.abstained).toBe(true)
    expect(result.citationCount).toBe(0)
  })

  it('aggregates rates across questions', () => {
    const results: QuestionResult[] = [
      {
        id: 'a',
        kind: 'in-corpus',
        question: 'q',
        expectedSection: 'ipc:302',
        baseline: {
          ...scoreAnswer({ answer: '[[IPC s.999 | "x y z"]]', expectedSectionId: 'ipc:302' }),
          answer: '',
        },
        grounded: {
          ...scoreAnswer({
            answer: `[[IPC s.302 | "${getSection('ipc:302')!.text.slice(0, 40)}"]]`,
            expectedSectionId: 'ipc:302',
            retrievedIds: new Set(['ipc:302']),
          }),
          answer: '',
          providerAbstained: false,
        },
      },
    ]
    const summary = summarize(results)
    expect(summary.sampleSize).toBe(1)
    expect(summary.baseline.fabricatedCount).toBe(1)
    expect(summary.grounded.verifiedCount).toBe(1)
    expect(summary.grounded.questionAccuracy).toBe(1)
  })
})
