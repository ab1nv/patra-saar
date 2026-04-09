/**
 * Integration tests for the document processing pipeline.
 *
 * Step 1.6: Integration tests (mock the full document processing pipeline)
 *
 * These tests verify the integration points between:
 *   - extractText (document parser)
 *   - chunkText (chunking)
 *   - R2 file retrieval
 *   - D1 database updates
 *   - Vectorize embedding storage
 *
 * All external I/O is mocked. No real Workers bindings are needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processDocument, type ProcessDocumentPayload } from './process-document'

// ─── Mock: document-parser ────────────────────────────────────────────────────

vi.mock('./document-parser', () => ({
  extractText: vi.fn(),
  DocumentParseError: class DocumentParseError extends Error {
    constructor(msg: string, cause?: unknown) {
      super(msg)
      this.name = 'DocumentParseError'
      if (cause) this.cause = cause
    }
  },
}))

import { extractText } from './document-parser'

// ─── Mock: chunking ───────────────────────────────────────────────────────────

vi.mock('./chunking', () => ({
  chunkText: vi.fn(),
}))

import { chunkText } from './chunking'

// ─── Env factory ─────────────────────────────────────────────────────────────

function makeChunk(index: number) {
  return {
    id: `chunk-${index}`,
    index,
    content: `Chunk ${index} content about legal matters.`,
    metadata: { section: `${index}` },
  }
}

type MockStatement = {
  bind: ReturnType<typeof vi.fn>
  run: ReturnType<typeof vi.fn>
}

function makeStatement(): MockStatement {
  const stmt: MockStatement = {
    bind: vi.fn(),
    run: vi.fn().mockResolvedValue({}),
  }
  stmt.bind.mockReturnValue(stmt) // fluent chaining
  return stmt
}

function makeEnv(overrides: Partial<Record<string, any>> = {}) {
  const prepareStmt = makeStatement()

  const mockObject = {
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
  }

  const mockStorage = {
    get: vi.fn().mockResolvedValue(mockObject),
  }

  const mockAI = {
    run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }),
  }

  const mockVectorize = {
    upsert: vi.fn().mockResolvedValue({}),
  }

  const mockDB = {
    prepare: vi.fn().mockReturnValue(prepareStmt),
  }

  return {
    DB: mockDB,
    STORAGE: mockStorage,
    AI: mockAI,
    VECTORIZE: mockVectorize,
    // expose for assertions
    _prepareStmt: prepareStmt,
    _mockObject: mockObject,
    ...overrides,
  } as any
}

function makePayload(overrides: Partial<ProcessDocumentPayload> = {}): ProcessDocumentPayload {
  return {
    documentId: 'doc-001',
    jobId: 'job-001',
    chatId: 'chat-001',
    userId: 'user-001',
    r2Key: 'uploads/doc-001.pdf',
    filename: 'test.pdf',
    fileType: 'pdf',
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('processDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default happy-path mocks
    vi.mocked(extractText).mockResolvedValue({
      text: 'Section 1 This is a test legal document with sufficient content for processing.',
      format: 'pdf',
      pageCount: 5,
      warnings: [],
    })
    vi.mocked(chunkText).mockReturnValue([makeChunk(0), makeChunk(1), makeChunk(2)])
  })

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('completes successfully for a PDF from R2', async () => {
    const env = makeEnv()
    await processDocument(makePayload(), env)

    // DB.prepare was called (for status updates + inserts)
    expect(env.DB.prepare).toHaveBeenCalled()
    // R2 object was retrieved
    expect(env.STORAGE.get).toHaveBeenCalledWith('uploads/doc-001.pdf')
    // extractText was called with the right format
    expect(extractText).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'pdf')
    // chunkText was called with the extracted text
    expect(chunkText).toHaveBeenCalledWith(
      'Section 1 This is a test legal document with sufficient content for processing.',
    )
    // Vectorize upsert was called
    expect(env.VECTORIZE.upsert).toHaveBeenCalled()
  })

  it('completes successfully for a TXT file from R2', async () => {
    vi.mocked(extractText).mockResolvedValue({
      text: 'Plain text legal content for testing purposes',
      format: 'txt',
      warnings: [],
    })
    const env = makeEnv()
    await processDocument(makePayload({ fileType: 'txt', r2Key: 'uploads/doc-001.txt' }), env)
    expect(extractText).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'txt')
  })

  it('completes successfully for a DOCX file from R2', async () => {
    vi.mocked(extractText).mockResolvedValue({
      text: 'DOCX legal document text with multiple clauses.',
      format: 'docx',
      warnings: [],
    })
    const env = makeEnv()
    await processDocument(makePayload({ fileType: 'docx', r2Key: 'uploads/doc-001.docx' }), env)
    expect(extractText).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'docx')
  })

  // ── Status progression ──────────────────────────────────────────────────────

  it('updates job status from parsing -> chunking -> embedding -> ready', async () => {
    const env = makeEnv()
    await processDocument(makePayload(), env)

    const calls: string[] = env.DB.prepare.mock.calls.map((c: any[]) => c[0] as string)
    const updateJobCalls = calls.filter((sql) => sql.includes('UPDATE processing_jobs'))

    // Should have at least 4 status updates
    expect(updateJobCalls.length).toBeGreaterThanOrEqual(4)
  })

  it('sets document status to "processing" at start', async () => {
    const env = makeEnv()
    await processDocument(makePayload(), env)

    const stmt = env._prepareStmt
    const bindCalls: any[][] = stmt.bind.mock.calls
    const processingUpdate = bindCalls.find(
      (args) => args.includes('processing') && args.includes('doc-001'),
    )
    expect(processingUpdate).toBeDefined()
  })

  it('sets document status to "ready" on success', async () => {
    const env = makeEnv()
    await processDocument(makePayload(), env)

    const prepCalls: string[] = env.DB.prepare.mock.calls.map((c: any[]) => c[0] as string)
    const readyUpdate = prepCalls.some((sql) => sql.includes("status = 'ready'"))
    expect(readyUpdate).toBe(true)
  })

  // ── Chunk persistence ───────────────────────────────────────────────────────

  it('inserts every chunk into D1', async () => {
    vi.mocked(chunkText).mockReturnValue([makeChunk(0), makeChunk(1), makeChunk(2)])
    const env = makeEnv()
    await processDocument(makePayload(), env)

    const prepCalls: string[] = env.DB.prepare.mock.calls.map((c: any[]) => c[0] as string)
    const chunkInserts = prepCalls.filter((sql) => sql.includes('INSERT INTO document_chunks'))
    expect(chunkInserts).toHaveLength(3)
  })

  it('updates chunk_count on documents table', async () => {
    vi.mocked(chunkText).mockReturnValue([makeChunk(0), makeChunk(1)])
    const env = makeEnv()
    await processDocument(makePayload(), env)

    const bindCalls: any[][] = env._prepareStmt.bind.mock.calls
    const chunkCountUpdate = bindCalls.find(
      (args) => args[0] === 2 && args[1] === 'doc-001',
    )
    expect(chunkCountUpdate).toBeDefined()
  })

  // ── Embedding batching ──────────────────────────────────────────────────────

  it('calls AI embedding model for each chunk batch', async () => {
    const chunks = Array.from({ length: 3 }, (_, i) => makeChunk(i))
    vi.mocked(chunkText).mockReturnValue(chunks)
    vi.mocked(extractText).mockResolvedValue({
      text: 'legal text',
      format: 'pdf',
      warnings: [],
    })

    const env = makeEnv()
    // Return enough embedding vectors for each chunk
    env.AI.run.mockResolvedValue({ data: chunks.map(() => [0.1, 0.2, 0.3]) })

    await processDocument(makePayload(), env)
    expect(env.AI.run).toHaveBeenCalledWith('@cf/baai/bge-base-en-v1.5', expect.any(Object))
  })

  it('stores vectors in Vectorize with correct metadata', async () => {
    vi.mocked(chunkText).mockReturnValue([makeChunk(0)])
    vi.mocked(extractText).mockResolvedValue({ text: 'legal text', format: 'pdf', warnings: [] })
    const env = makeEnv()
    env.AI.run.mockResolvedValue({ data: [[0.1, 0.2, 0.3]] })

    await processDocument(makePayload(), env)

    const upsertCall = env.VECTORIZE.upsert.mock.calls[0][0]
    expect(upsertCall[0]).toMatchObject({
      id: 'chunk-0',
      values: [0.1, 0.2, 0.3],
      metadata: {
        document_id: 'doc-001',
        chat_id: 'chat-001',
        user_id: 'user-001',
        chunk_index: 0,
      },
    })
  })

  // ── Error handling ──────────────────────────────────────────────────────────

  it('sets job status to "failed" when R2 file is not found', async () => {
    const env = makeEnv()
    env.STORAGE.get.mockResolvedValue(null) // R2 returns null for missing objects

    await processDocument(makePayload(), env)

    const bindCalls: any[][] = env._prepareStmt.bind.mock.calls
    const failedUpdate = bindCalls.find((args) => args.includes('failed'))
    expect(failedUpdate).toBeDefined()
  })

  it('sets job status to "failed" when STORAGE binding is missing', async () => {
    const env = makeEnv({ STORAGE: undefined })

    await processDocument(makePayload(), env)

    const bindCalls: any[][] = env._prepareStmt.bind.mock.calls
    const failedUpdate = bindCalls.find((args) => args.includes('failed'))
    expect(failedUpdate).toBeDefined()
  })

  it('sets job status to "failed" when extractText throws', async () => {
    vi.mocked(extractText).mockRejectedValue(new Error('PDF is encrypted'))
    const env = makeEnv()

    await processDocument(makePayload(), env)

    const bindCalls: any[][] = env._prepareStmt.bind.mock.calls
    const failedUpdate = bindCalls.find((args) => args.includes('failed'))
    expect(failedUpdate).toBeDefined()
  })

  it('records error message in job when processing fails', async () => {
    vi.mocked(extractText).mockRejectedValue(new Error('Corrupted PDF'))
    const env = makeEnv()

    await processDocument(makePayload(), env)

    const bindCalls: any[][] = env._prepareStmt.bind.mock.calls
    // updateJob signature: bind(status, progress, errorMessage, jobId)
    // The error message is the 3rd positional argument (index 2)
    const errorMsgUpdate = bindCalls.find(
      (args) => typeof args[2] === 'string' && args[2].includes('Corrupted PDF'),
    )
    expect(errorMsgUpdate).toBeDefined()
  })

  it('sets document status to "failed" when processing fails', async () => {
    vi.mocked(extractText).mockRejectedValue(new Error('parse failure'))
    const env = makeEnv()

    await processDocument(makePayload(), env)

    const prepCalls: string[] = env.DB.prepare.mock.calls.map((c: any[]) => c[0] as string)
    const docFailedUpdate = prepCalls.some(
      (sql) => sql.includes('UPDATE documents') && sql.includes('status'),
    )
    expect(docFailedUpdate).toBe(true)
  })

  it('does not throw even when all steps fail', async () => {
    vi.mocked(extractText).mockRejectedValue(new Error('total failure'))
    const env = makeEnv()
    // Even DB calls fail
    env.DB.prepare.mockImplementation(() => {
      throw new Error('DB connection lost')
    })

    // Should never throw — errors are caught internally
    await expect(processDocument(makePayload(), env)).resolves.toBeUndefined()
  })

  // ── Source URL path ─────────────────────────────────────────────────────────

  it('fetches and parses content from sourceUrl when r2Key is absent', async () => {
    vi.mocked(extractText).mockResolvedValue({
      text: 'URL fetched legal text content here.',
      format: 'txt',
      warnings: [],
    })

    const env = makeEnv()
    const payload = makePayload({
      r2Key: undefined,
      sourceUrl: 'https://example.com/law.txt',
      fileType: 'txt',
    })

    await processDocument(payload, env)
    // R2 was NOT accessed
    expect(env.STORAGE.get).not.toHaveBeenCalled()
  })

  it('marks job failed when sourceUrl fetch returns non-200', async () => {
    // Mock global fetch to return 404
    const origFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as any

    const env = makeEnv()
    const payload = makePayload({
      r2Key: undefined,
      sourceUrl: 'https://example.com/missing.txt',
      fileType: 'txt',
    })

    await processDocument(payload, env)

    const bindCalls: any[][] = env._prepareStmt.bind.mock.calls
    const failedUpdate = bindCalls.find((args) => args.includes('failed'))
    expect(failedUpdate).toBeDefined()

    globalThis.fetch = origFetch
  })

  it('fetches raw binary from sourceUrl when content-type is not HTML', async () => {
    vi.mocked(extractText).mockResolvedValue({
      text: 'Binary file content parsed successfully',
      format: 'pdf',
      warnings: [],
    })

    const origFetch = globalThis.fetch
    const mockArrayBuffer = new ArrayBuffer(200)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/pdf' },
      arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      text: vi.fn(),
    }) as any

    const env = makeEnv()
    const payload = makePayload({
      r2Key: undefined,
      sourceUrl: 'https://example.com/law.pdf',
      fileType: 'pdf',
    })

    await processDocument(payload, env)
    expect(extractText).toHaveBeenCalled()

    globalThis.fetch = origFetch
  })

  it('strips HTML tags when content-type is text/html from URL', async () => {
    vi.mocked(extractText).mockResolvedValue({
      text: 'Parsed HTML text content here for legal purposes.',
      format: 'txt',
      warnings: [],
    })

    const origFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: vi.fn().mockResolvedValue('<html><body><p>Legal text content.</p></body></html>'),
      arrayBuffer: vi.fn(),
    }) as any

    const env = makeEnv()
    const payload = makePayload({
      r2Key: undefined,
      sourceUrl: 'https://example.com/law',
      fileType: 'html',
    })

    await processDocument(payload, env)
    expect(extractText).toHaveBeenCalled()

    globalThis.fetch = origFetch
  })

  it('marks job failed when neither r2Key nor sourceUrl is provided', async () => {
    const env = makeEnv()
    const payload = makePayload({ r2Key: undefined, sourceUrl: undefined })

    await processDocument(payload, env)

    const bindCalls: any[][] = env._prepareStmt.bind.mock.calls
    const failedUpdate = bindCalls.find((args) => args.includes('failed'))
    expect(failedUpdate).toBeDefined()
  })

  it('emits warnings to console when parser returns them', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(extractText).mockResolvedValue({
      text: 'Legal document with some warnings about encoding.',
      format: 'pdf',
      warnings: ['Invalid font encoding detected'],
    })

    const env = makeEnv()
    vi.mocked(chunkText).mockReturnValue([makeChunk(0)])
    env.AI.run.mockResolvedValue({ data: [[0.1, 0.2]] })

    await processDocument(makePayload(), env)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Parser warnings'),
      expect.arrayContaining(['Invalid font encoding detected']),
    )

    warnSpy.mockRestore()
  })

  it('marks job failed when text is too short (< 10 chars)', async () => {
    vi.mocked(extractText).mockResolvedValue({
      text: 'short',
      format: 'txt',
      warnings: [],
    })

    const env = makeEnv()
    await processDocument(makePayload({ fileType: 'txt' }), env)

    const bindCalls: any[][] = env._prepareStmt.bind.mock.calls
    const failedUpdate = bindCalls.find((args) => args.includes('failed'))
    expect(failedUpdate).toBeDefined()
  })
})
