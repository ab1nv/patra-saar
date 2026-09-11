import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { retrieve } from '@/lib/corpus/retrieve'
import { streamAnswer, llmProvider, titleFor, type ChatMode } from '@/lib/llm'
import { ABSTAIN_MESSAGE } from '@/lib/llm/prompt'
import { verifyCitations } from '@/lib/citations/verify'
import { addMessage, createCase, getCase, newId, updateCase } from '@/lib/db/store'
import { BadRequest, Unauthorized, handleError } from '@/lib/api/respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  question: z.string().min(1).max(2000),
  caseId: z.string().min(1).optional(),
  mode: z.enum(['lawyer', 'client']).default('lawyer'),
  incognito: z.boolean().default(false),
  attachmentText: z.string().max(50_000).optional(),
  selectionContext: z.string().max(4000).optional(),
})

type ClientCitation = {
  index: number
  actName: string
  actFull?: string
  number: string
  quote: string
  sectionId?: string
  title?: string
  verified: boolean
  failureReason?: string
}

function stripSectionText(
  citations: ReturnType<typeof verifyCitations>['citations'],
): ClientCitation[] {
  return citations.map((c) => ({
    index: c.index,
    actName: c.actName,
    actFull: c.actFull,
    number: c.number,
    quote: c.quote,
    sectionId: c.sectionId,
    title: c.title,
    verified: c.verified,
    failureReason: c.failureReason,
  }))
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) throw new Unauthorized()

    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new BadRequest('A question is required')

    const {
      question,
      caseId: requestedCaseId,
      mode,
      incognito,
      attachmentText,
      selectionContext,
    } = parsed.data

    const retrievalQuery = [selectionContext, question].filter(Boolean).join(' ')
    const retrieval = retrieve(retrievalQuery)
    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

        // Incognito: never persist, never create a case.
        let caseId: string | null = null
        if (!incognito) {
          if (requestedCaseId) {
            const existing = await getCase(session.sub, requestedCaseId).catch(() => undefined)
            caseId = existing?.id ?? (await createCase(session.sub, 'New inquiry')).id
          } else {
            caseId = (await createCase(session.sub, 'New inquiry')).id
          }
        }

        send({
          type: 'meta',
          provider: llmProvider(),
          caseId,
          abstained: retrieval.abstain,
          incognito,
          retrieved: retrieval.sections.map((s) => ({
            id: s.id,
            act: s.act,
            number: s.number,
            title: s.title,
            matchType: s.matchType,
          })),
        })

        let full = ''
        try {
          if (retrieval.abstain) {
            full = ABSTAIN_MESSAGE
            send({ type: 'token', value: ABSTAIN_MESSAGE })
          } else {
            for await (const delta of streamAnswer(question, retrieval.sections, mode as ChatMode, {
              attachmentText,
              selectionContext,
            })) {
              full += delta
              send({ type: 'token', value: delta })
            }
          }
        } catch (err) {
          console.error('[chat] generation failed:', err)
          const msg = '\n\n_[generation error — try again]_'
          full += msg
          send({ type: 'token', value: msg })
        }

        const verification = retrieval.abstain
          ? { citations: [], verifiedCount: 0, unverifiedCount: 0 }
          : verifyCitations(full, retrieval.sections)

        const clientCitations = stripSectionText(verification.citations)
        send({
          type: 'citations',
          value: clientCitations,
          verifiedCount: verification.verifiedCount,
          unverifiedCount: verification.unverifiedCount,
        })

        // Title: model-generated once, then reused for the life of the chat.
        const title = await titleFor(question, full)
        const messageId = newId()
        if (!incognito && caseId) {
          try {
            await updateCase(session.sub, caseId, { title })
            await addMessage({
              id: newId(),
              caseId,
              role: 'user',
              content: question,
              citationsJson: null,
              abstained: false,
              createdAt: Date.now(),
            })
            await addMessage({
              id: messageId,
              caseId,
              role: 'assistant',
              content: full,
              citationsJson: JSON.stringify(clientCitations),
              abstained: retrieval.abstain,
              createdAt: Date.now() + 1,
            })
          } catch (err) {
            console.error('[chat] persistence failed:', err)
          }
        }

        send({ type: 'title', caseId, title })
        send({
          type: 'done',
          caseId,
          messageId,
          title,
          verifiedCount: verification.verifiedCount,
          unverifiedCount: verification.unverifiedCount,
          abstained: retrieval.abstain,
        })
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
