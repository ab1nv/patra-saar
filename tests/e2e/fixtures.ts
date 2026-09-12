export function sse(events: object[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('')
}

export const CHAT_ANSWER = {
  meta: {
    type: 'meta',
    provider: 'offline',
    model: 'test-model',
    caseId: 'case-fixture',
    abstained: false,
    incognito: false,
  },
  citations: {
    type: 'citations',
    value: [
      {
        index: 1,
        actName: 'BNS',
        actFull: 'Bharatiya Nyaya Sanhita, 2023',
        number: '103',
        quote: 'Whoever commits murder shall be punished with death or imprisonment for life',
        sectionId: 'bns:103',
        title: 'Punishment for murder',
        verified: true,
      },
    ],
    verifiedCount: 1,
    unverifiedCount: 0,
  },
  title: { type: 'title', caseId: 'case-fixture', title: 'Murder Under BNS' },
  done: {
    type: 'done',
    caseId: 'case-fixture',
    messageId: 'msg-fixture',
    title: 'Murder Under BNS',
    verifiedCount: 1,
    unverifiedCount: 0,
    abstained: false,
  },
}

export const ABSTAIN_ANSWER = {
  meta: {
    type: 'meta',
    provider: 'offline',
    model: 'test-model',
    caseId: 'case-abstain',
    abstained: true,
    incognito: false,
  },
  citations: { type: 'citations', value: [], verifiedCount: 0, unverifiedCount: 0 },
  title: { type: 'title', caseId: 'case-abstain', title: 'GST Query' },
  done: {
    type: 'done',
    caseId: 'case-abstain',
    messageId: 'msg-abstain',
    title: 'GST Query',
    verifiedCount: 0,
    unverifiedCount: 0,
    abstained: true,
  },
}
