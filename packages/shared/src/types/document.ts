export interface Document {
  id: string
  userId: string
  caseId?: string
  name: string
  docType: 'contract' | 'fir' | 'court_order' | 'legal_notice' | 'statute'
  status: 'processing' | 'ready' | 'failed'
  summary?: string
  pageCount?: number
  language: 'en' | 'hi' | 'mixed'
  createdAt: number
}

export interface Chunk {
  id: string
  documentId: string
  chunkIndex: number
  pageNumber: number
  text: string
  tokenCount: number
  vectorId?: string
  source: 'user-doc' | 'legal-corpus'
}
