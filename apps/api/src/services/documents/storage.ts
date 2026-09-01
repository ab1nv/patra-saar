import type { Env } from '../../types/bindings'

/** Upload a raw document (PDF binary) to R2. Returns the R2 key. */
export async function uploadDocument(
  file: ArrayBuffer,
  fileName: string,
  userId: string,
  env: Env,
): Promise<string> {
  const r2Key = `${userId}/${Date.now()}-${fileName}`
  await env.DOCUMENTS.put(r2Key, file)
  return r2Key
}

/** Download a document from R2 by its key. */
export async function downloadDocument(r2Key: string, env: Env): Promise<ArrayBuffer | null> {
  const object = await env.DOCUMENTS.get(r2Key)
  return object ? object.arrayBuffer() : null
}

/** Delete a document from R2. */
export async function deleteDocument(r2Key: string, env: Env): Promise<void> {
  await env.DOCUMENTS.delete(r2Key)
}
