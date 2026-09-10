import { NextResponse } from 'next/server'
import { corpusMeta } from '@/lib/corpus'
import { llmProvider } from '@/lib/llm'

export const runtime = 'nodejs'

export async function GET() {
  const meta = corpusMeta()
  return NextResponse.json({
    status: 'ok',
    corpusSections: meta.sectionCount,
    builtAt: meta.builtAt,
    provider: llmProvider(),
  })
}
