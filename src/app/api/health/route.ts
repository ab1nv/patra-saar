import { NextResponse } from 'next/server'
import { corpusMeta } from '@/lib/corpus'
import { currentModel, llmProvider } from '@/lib/llm'
import { groqModels } from '@/lib/llm/groq'

export const runtime = 'nodejs'

export async function GET() {
  const meta = corpusMeta()
  return NextResponse.json({
    status: 'ok',
    corpusSections: meta.sectionCount,
    builtAt: meta.builtAt,
    provider: llmProvider(),
    model: currentModel(),
    models: llmProvider() === 'offline' ? ['offline'] : groqModels(),
  })
}
