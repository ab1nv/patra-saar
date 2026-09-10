import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { BadRequest, Unauthorized, handleError } from '@/lib/api/respond'

export const runtime = 'nodejs'

const MAX_BYTES = 15 * 1024 * 1024

/** Extracts plain text from an uploaded PDF (or text file) so it can be sent to the model. */
export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) throw new Unauthorized()

    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) throw new BadRequest('No file provided')
    if (file.size > MAX_BYTES) throw new BadRequest('File is larger than 15 MB')

    const buffer = new Uint8Array(await file.arrayBuffer())
    let text = ''

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const { extractText, getDocumentProxy } = await import('unpdf')
      const pdf = await getDocumentProxy(buffer)
      const result = await extractText(pdf, { mergePages: true })
      text = Array.isArray(result.text) ? result.text.join('\n') : result.text
    } else {
      text = new TextDecoder().decode(buffer)
    }

    const cleaned = text
      .replace(/\u0000/g, '')
      .replace(/[ \t]+/g, ' ')
      .trim()
    if (!cleaned) throw new BadRequest('Could not extract any text from that file')

    return NextResponse.json({
      name: file.name,
      chars: cleaned.length,
      text: cleaned.slice(0, 50_000),
    })
  } catch (err) {
    return handleError(err)
  }
}
