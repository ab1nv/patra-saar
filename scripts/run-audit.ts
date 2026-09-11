/**
 * Hallucination audit harness.
 *
 * Runs the same question set through two arms against the same model:
 *   - baseline: no retrieval, answer from parametric memory (simulates "just ask a chatbot")
 *   - grounded: PatraSaar's retrieve -> constrain -> verify pipeline
 *
 * Both arms are scored deterministically against data/corpus.json. Results are
 * written to data/audit-results.json and rendered by /audit.
 *
 * Run: pnpm audit:run [--limit N]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { retrieve } from '../src/lib/corpus/retrieve'
import { ABSTAIN_MESSAGE, buildBaselinePrompt, buildPrompt } from '../src/lib/llm/prompt'
import { completeGroq } from '../src/lib/llm/groq'
import { scoreAnswer, summarize, type QuestionResult } from '../src/lib/audit/score'

try {
  process.loadEnvFile('.env')
} catch {
  // fall back to real environment variables
}

type AuditQuestion = {
  id: string
  kind: 'in-corpus' | 'nonexistent' | 'out-of-corpus'
  question: string
  expectedSection?: string
}

const questions = (
  JSON.parse(readFileSync('data/audit-questions.json', 'utf8')) as { questions: AuditQuestion[] }
).questions

const limitArg = process.argv.indexOf('--limit')
const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : questions.length
const selected = questions.slice(0, Number.isFinite(limit) && limit > 0 ? limit : questions.length)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function withRetry<T>(label: string, fn: () => Promise<T>, tries = 8): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const message = err instanceof Error ? err.message : String(err)
      const retryable =
        /429|rate limit|timed? ?out|timeout|ECONNRESET|ETIMEDOUT|APIConnection|fetch failed|503|502/i.test(
          message,
        )
      if (!retryable || i === tries - 1) break

      // Honour the server's retry-after when present, else exponential backoff.
      const headers = (err as { headers?: Record<string, string> }).headers
      const retryAfter = Number(headers?.['retry-after'])
      const wait =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(60_000, (retryAfter + 1) * 1000)
          : ([3000, 6000, 10000, 15000, 20000, 30000, 45000][i] ?? 45_000)
      console.warn(`  ! ${label}: retrying in ${Math.round(wait / 1000)}s`)
      await sleep(wait)
    }
  }
  throw lastErr
}

async function runBaseline(question: string): Promise<string> {
  const { system, user } = buildBaselinePrompt(question)
  return withRetry('baseline', () =>
    completeGroq(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      300,
    ),
  )
}

async function runGrounded(
  question: string,
): Promise<{ answer: string; providerAbstained: boolean; retrievedIds: Set<string> }> {
  const retrieval = retrieve(question)
  const retrievedIds = new Set(retrieval.sections.map((s) => s.id))
  if (retrieval.abstain) {
    return { answer: ABSTAIN_MESSAGE, providerAbstained: true, retrievedIds }
  }
  const { system, user } = buildPrompt(question, retrieval.sections, 'lawyer')
  const answer = await withRetry('grounded', () =>
    completeGroq(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      650,
    ),
  )
  return { answer, providerAbstained: false, retrievedIds }
}

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set — cannot run the audit.')
    process.exit(1)
  }

  const model = process.env.GROQ_MODEL ?? 'unknown'

  // Resume: keep questions already scored in a previous run unless --fresh is passed.
  const fresh = process.argv.includes('--fresh')
  const existing: QuestionResult[] =
    !fresh && existsSync('data/audit-results.json')
      ? (
          JSON.parse(readFileSync('data/audit-results.json', 'utf8')) as {
            results: QuestionResult[]
          }
        ).results
      : []
  const done = new Set(existing.map((r) => r.id))
  const todo = selected.filter((q) => !done.has(q.id))

  console.log(
    `Running hallucination audit: ${todo.length} questions to do (${done.size} already done), model ${model}\n`,
  )

  const results: QuestionResult[] = [...existing]

  for (let i = 0; i < todo.length; i++) {
    const q = todo[i]!
    const [baselineAnswer, grounded] = await Promise.all([
      runBaseline(q.question),
      runGrounded(q.question),
    ])
    // Free-tier token budget: pace requests so we do not trip the per-minute cap.
    await sleep(1500)

    const result: QuestionResult = {
      id: q.id,
      kind: q.kind,
      question: q.question,
      expectedSection: q.expectedSection,
      baseline: {
        ...scoreAnswer({ answer: baselineAnswer, expectedSectionId: q.expectedSection }),
        answer: baselineAnswer,
      },
      grounded: {
        ...scoreAnswer({
          answer: grounded.answer,
          expectedSectionId: q.expectedSection,
          retrievedIds: grounded.retrievedIds,
        }),
        answer: grounded.answer,
        providerAbstained: grounded.providerAbstained,
      },
    }
    results.push(result)

    const b = result.baseline
    const g = result.grounded
    console.log(
      `[${String(i + 1).padStart(2)}/${todo.length}] ${q.id} ${q.kind.padEnd(13)} ` +
        `baseline: ${b.citationCount} cit, ${b.fabricatedCount} fabricated | ` +
        `patrasaar: ${g.citationCount} cit, ${g.verifiedCount} verified, ${g.abstained ? 'abstained' : ''}`,
    )

    // Save incrementally so a long run is never lost.
    writeFileSync(
      'data/audit-results.json',
      JSON.stringify(
        {
          runAt: new Date().toISOString(),
          model,
          provider: 'groq',
          sampleSize: results.length,
          summary: summarize(results),
          results,
        },
        null,
        2,
      ),
    )
  }

  const summary = summarize(results)
  console.log('\n=== Summary ===')
  console.log('Baseline (no retrieval):')
  console.log(`  citations: ${summary.baseline.citations}`)
  console.log(
    `  fabricated: ${summary.baseline.fabricatedCount} (${(summary.baseline.fabricatedRate * 100).toFixed(1)}%)`,
  )
  console.log(`  correct section: ${(summary.baseline.correctRate * 100).toFixed(1)}%`)
  console.log(`  abstained: ${(summary.baseline.abstainRate * 100).toFixed(1)}%`)
  console.log('PatraSaar (retrieve + verify):')
  console.log(`  citations: ${summary.grounded.citations}`)
  console.log(
    `  verified: ${summary.grounded.verifiedCount} (${(summary.grounded.verifiedRate * 100).toFixed(1)}%)`,
  )
  console.log(
    `  fabricated: ${summary.grounded.fabricatedCount} (${(summary.grounded.fabricatedRate * 100).toFixed(1)}%)`,
  )
  console.log(`  correct section: ${(summary.grounded.correctRate * 100).toFixed(1)}%`)
  console.log(`  abstained: ${(summary.grounded.abstainRate * 100).toFixed(1)}%`)
  console.log('\nWrote data/audit-results.json')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
