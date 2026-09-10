export type ParseQuality = 'sectioned' | 'chunked'

export type Section = {
  id: string
  act: string
  actFull: string
  number: string
  title: string
  text: string
  tokens: string[]
  parseQuality: ParseQuality
}

export type CorpusAct = {
  act: string
  actFull: string
  sectionCount: number
  sourceFile: string
  parseQuality: ParseQuality
}

export type Corpus = {
  builtAt: string
  acts: CorpusAct[]
  sections: Section[]
}

export type MatchType = 'exact' | 'lexical'

export type RetrievedSection = Section & {
  score: number
  matchType: MatchType
}

export type RetrievalResult = {
  sections: RetrievedSection[]
  abstain: boolean
  topScore: number
  /** fraction of query content terms found in the best matching section */
  coverage: number
}
