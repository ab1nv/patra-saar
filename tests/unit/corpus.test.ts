import { describe, it, expect } from 'vitest'
import { actSlugFromName, getSection, getSectionByActNumber } from '@/lib/corpus'

describe('act name resolution', () => {
  it('resolves short codes', () => {
    expect(actSlugFromName('IPC')).toBe('ipc')
    expect(actSlugFromName('BNS')).toBe('bns')
    expect(actSlugFromName('BSA')).toBe('bsa')
    expect(actSlugFromName('NI Act')).toBe('ni')
    expect(actSlugFromName('DPDP')).toBe('dpdp')
    expect(actSlugFromName('Limitation Act')).toBe('limitation')
    expect(actSlugFromName('Arbitration Act')).toBe('arbitration')
    expect(actSlugFromName('Specific Relief Act')).toBe('specific-relief')
  })

  it('resolves full act names with a year suffix', () => {
    expect(actSlugFromName('Bharatiya Nyaya Sanhita, 2023')).toBe('bns')
    expect(actSlugFromName('Indian Penal Code, 1860')).toBe('ipc')
    expect(actSlugFromName('Indian Contract Act, 1872')).toBe('contract')
    expect(actSlugFromName('Negotiable Instruments Act, 1881')).toBe('ni')
    expect(actSlugFromName('Arbitration and Conciliation Act, 1996')).toBe('arbitration')
    expect(actSlugFromName('Digital Personal Data Protection Act, 2023')).toBe('dpdp')
  })

  it('looks a section up by act name and number', () => {
    const s = getSectionByActNumber('Bharatiya Nyaya Sanhita, 2023', '103')
    expect(s?.id).toBe('bns:103')
    expect(s?.title).toBe('Punishment for murder')

    const ni = getSectionByActNumber('NI Act', '138')
    expect(ni?.id).toBe('ni:138')
    expect(ni?.title).toContain('Dishonour of cheque')

    const dpdp = getSectionByActNumber('DPDP Act', '4')
    expect(dpdp?.id).toBe('dpdp:4')
    expect(dpdp?.title).toBe('Grounds for processing personal data')
  })

  it('does not confuse same-numbered sections across acts', () => {
    expect(getSection('bns:103')?.actFull).toContain('Bharatiya Nyaya Sanhita')
    expect(getSection('ipc:103')?.actFull).toContain('Indian Penal Code')
    expect(getSection('ni:138')?.actFull).toContain('Negotiable Instruments')
  })
})
