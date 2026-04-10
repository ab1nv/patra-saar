import type { Env } from '../../types/bindings'
import type { Document } from '@patrasaar/shared'

/** Create a document record in D1. */
export async function createDocument(doc: Omit<Document, 'createdAt'>, env: Env): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO documents (id, user_id, case_id, name, doc_type, r2_key, page_count, language, status, summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      doc.id,
      doc.userId,
      doc.caseId ?? null,
      doc.name,
      doc.docType,
      'pending', // r2_key set after upload
      doc.pageCount ?? null,
      doc.language,
      doc.status,
      doc.summary ?? null,
    )
    .run()
}

/** Fetch a document by ID. Returns null if not found or wrong user. */
export async function getDocument(
  documentId: string,
  userId: string,
  env: Env,
): Promise<Document | null> {
  const row = await env.DB.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .bind(documentId, userId)
    .first()

  return row ? mapRowToDocument(row) : null
}

/** List all documents for a user. */
export async function listDocuments(userId: string, env: Env): Promise<Document[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
  )
    .bind(userId)
    .all()

  return results.map(mapRowToDocument)
}

/** Map a raw D1 row to the Document type. */
function mapRowToDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    caseId: (row.case_id as string) ?? undefined,
    name: row.name as string,
    docType: row.doc_type as Document['docType'],
    status: row.status as Document['status'],
    summary: (row.summary as string) ?? undefined,
    pageCount: (row.page_count as number) ?? undefined,
    language: row.language as Document['language'],
    createdAt: row.created_at as number,
  }
}
