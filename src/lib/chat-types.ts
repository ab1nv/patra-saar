export type ChatCitation = {
  index: number
  actName: string
  actFull?: string
  number: string
  subsection?: string
  quote: string
  sectionId?: string
  title?: string
  verified: boolean
  failureReason?: string
}

export type ChatMessage = {
  id?: string
  role: 'user' | 'assistant'
  content: string
  citations?: ChatCitation[]
  verifiedCount?: number
  unverifiedCount?: number
  abstained?: boolean
}

export type CaseSummary = {
  id: string
  title: string
  pinned: boolean
  createdAt: number
}

export type StreamEvent =
  | {
      type: 'meta'
      provider: string
      model: string
      caseId: string | null
      abstained: boolean
      incognito: boolean
    }
  | { type: 'token'; value: string }
  | {
      type: 'citations'
      value: ChatCitation[]
      verifiedCount: number
      unverifiedCount: number
    }
  | { type: 'title'; caseId: string | null; title: string }
  | {
      type: 'done'
      caseId: string | null
      messageId: string
      title: string
      verifiedCount: number
      unverifiedCount: number
      abstained: boolean
    }
