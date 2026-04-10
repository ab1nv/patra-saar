export interface Citation {
  id: string
  type: 'CASE_LAW' | 'STATUTE' | 'HIGH_COURT'
  title: string
  court?: string
  year?: number
  relevance: number // 0.0 to 1.0
  verified: boolean
  url?: string // India Kanoon deep link
  excerpt?: string
}

export interface InquiryStreamEvent {
  type: 'text' | 'citations' | 'metadata' | 'done' | 'error'
  content?: string
  citations?: Citation[]
  confidence?: number
  model?: string
  tags?: string[]
  error?: string
}
