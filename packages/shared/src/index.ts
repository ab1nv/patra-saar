import { z } from 'zod'

// -- Chat schemas --

export const createChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})

export const updateChatSchema = z.object({
  title: z.string().min(1).max(200),
})

export const chatSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Chat = z.infer<typeof chatSchema>
export type CreateChatInput = z.infer<typeof createChatSchema>
export type UpdateChatInput = z.infer<typeof updateChatSchema>

// -- Message schemas --

export const messageRoleSchema = z.enum(['user', 'assistant'])

export const sendMessageSchema = z.object({
  content: z.string().max(10000).optional(),
  // file and url are handled separately via multipart
})

export const citationSchema = z.object({
  refNumber: z.number(),
  section: z.string().optional(),
  page: z.number().optional(),
  snippet: z.string(),
})

export const messageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  citations: z.array(citationSchema).nullable(),
  tokensUsed: z.number().nullable(),
  createdAt: z.string(),
})

export type Message = z.infer<typeof messageSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type Citation = z.infer<typeof citationSchema>

// -- Document schemas --

export const documentStatusSchema = z.enum(['pending', 'processing', 'ready', 'failed'])

export const documentSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  messageId: z.string().nullable(),
  userId: z.string(),
  originalFilename: z.string(),
  fileType: z.string(),
  fileSize: z.number().nullable(),
  pageCount: z.number().nullable(),
  r2Key: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  status: documentStatusSchema,
  chunkCount: z.number(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  processedAt: z.string().nullable(),
})

export type Document = z.infer<typeof documentSchema>

// -- Processing job schemas --

export const jobStatusSchema = z.enum([
  'queued',
  'parsing',
  'chunking',
  'embedding',
  'ready',
  'failed',
])

export const processingJobSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  status: jobStatusSchema,
  progress: z.number().min(0).max(100),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ProcessingJob = z.infer<typeof processingJobSchema>

// -- File upload validation --

export const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as const

export const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'doc', 'docx'] as const

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_PAGE_COUNT = 100

export function isAllowedFileType(mimeType: string): boolean {
  return (ALLOWED_FILE_TYPES as readonly string[]).includes(mimeType)
}

export function isAllowedExtension(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext !== undefined && (ALLOWED_EXTENSIONS as readonly string[]).includes(ext as any)
}

export function isWithinSizeLimit(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE_BYTES
}

// -- API response wrappers --

export interface ApiResponse<T> {
  data: T
  error?: never
}

export interface ApiError {
  data?: never
  error: {
    message: string
    code?: string
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// -- Legal disclaimer --

export const LEGAL_DISCLAIMER =
  'This is for informational purposes only, not legal advice. For specific legal matters, consult a qualified lawyer.'
