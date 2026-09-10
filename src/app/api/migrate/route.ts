import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { migrate, type MigrateDirection, type MigrateResult } from '@/lib/migrate'
import type { Section } from '@/lib/corpus/types'
import { BadRequest, Unauthorized, handleError } from '@/lib/api/respond'

export const runtime = 'nodejs'

type PublicSection = Omit<Section, 'tokens'>
function publicSection(s?: Section): PublicSection | undefined {
  if (!s) return undefined
  const { tokens: _tokens, ...rest } = s
  return rest
}

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) throw new Unauthorized()

    const url = new URL(req.url)
    const ipc = url.searchParams.get('ipc')
    const bns = url.searchParams.get('bns')
    if (!ipc && !bns) throw new BadRequest('Provide ?ipc= or ?bns=')

    const direction: MigrateDirection = ipc ? 'ipc->bns' : 'bns->ipc'
    const result = migrate(direction, (ipc ?? bns)!.trim())

    const payload: Omit<MigrateResult, 'source' | 'target' | 'candidates'> & {
      source?: PublicSection
      target?: PublicSection
      candidates: { section: PublicSection; score: number }[]
    } = {
      ...result,
      source: publicSection(result.source),
      target: publicSection(result.target),
      candidates: result.candidates.map((c) => ({
        section: publicSection(c.section)!,
        score: c.score,
      })),
    }
    return NextResponse.json(payload)
  } catch (err) {
    return handleError(err)
  }
}
