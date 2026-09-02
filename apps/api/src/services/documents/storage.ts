import type { Env } from '../../types/bindings'

/** 15 MB limit — KV supports up to 25MB, but we cap lower for UX speed. */
export const MAX_FILE_SIZE = 15 * 1024 * 1024

/**
 * Upload a raw document (PDF binary) to KV.
 *
 * KV writes are fire-and-forget at the edge — the put() call returns
 * almost instantly. The data replicates globally within ~60s, but
 * reads from the same colo are immediate.
 *
 * Returns the KV key used for later retrieval.
 */
export async function uploadDocument(
  file: ArrayBuffer,
  fileName: string,
  userId: string,
  env: Env,
): Promise<string> {
  if (file.byteLength > MAX_FILE_SIZE) {
    throw new Error(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
  }

  const kvKey = `doc:${userId}:${Date.now()}-${fileName}`
  // KV accepts ArrayBuffer directly — no encoding step needed
  await env.DOCUMENTS.put(kvKey, file)
  return kvKey
}

/**
 * Download a document from KV by its key.
 *
 * Uses 'arrayBuffer' type hint so KV skips text decoding and
 * returns the raw binary directly — fastest possible path.
 */
export async function downloadDocument(kvKey: string, env: Env): Promise<ArrayBuffer | null> {
  return env.DOCUMENTS.get(kvKey, { type: 'arrayBuffer' })
}

/** Delete a document from KV. */
export async function deleteDocument(kvKey: string, env: Env): Promise<void> {
  await env.DOCUMENTS.delete(kvKey)
}
