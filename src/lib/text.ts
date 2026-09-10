const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'have',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'its',
  'may',
  'me',
  'my',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'this',
  'to',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'why',
  'will',
  'with',
  'would',
  'you',
  'your',
  'can',
  'do',
  'does',
  'did',
  'about',
  'into',
  'than',
  'so',
  'such',
  'any',
  'all',
  'no',
  'not',
])

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function contentTokens(input: string): string[] {
  return tokenize(input).filter((t) => !STOPWORDS.has(t) && t.length > 1)
}

/**
 * Normalizes text for verbatim quote comparison: lowercase, strip punctuation,
 * collapse whitespace, unify quotes/dashes. Applied identically to the model's
 * quote and to the source section text, so punctuation drift cannot fail a match
 * but paraphrasing still does.
 */
export function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, '')
    .replace(/[\u2013\u2014]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
