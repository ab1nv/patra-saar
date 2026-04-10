import { z } from 'zod'

/** Validates the body of POST /inquiries/stream */
export const inquiryRequestSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1),
  question: z.string().min(1).max(2000),
})

/** Validates the body of POST /documents (metadata, not the file itself) */
export const documentUploadSchema = z.object({
  name: z.string().min(1).max(255),
  docType: z.enum(['contract', 'fir', 'court_order', 'legal_notice', 'statute']),
  caseId: z.string().optional(),
  language: z.enum(['en', 'hi', 'mixed']).default('en'),
})

/** Validates the body of POST /cases */
export const caseCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
})

/** Validates the body of PUT /cases/:id */
export const caseUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
})
