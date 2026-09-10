import { describe, it, expect } from 'vitest'
import { actSlugFromName, getSection, getSectionByActNumber } from '@/lib/corpus'

describe('act name resolution', () => {
  it('resolves short codes', () => {
    expect(actSlugFromName('IPC')).toBe('ipc')
    expect(actSlugFromName('BNS')).toBe('bns')
    expect(actSlugFromName('BSA')).toBe('bsa')
  })

  it('resolves full act names with a year suffix', () => {
    expect(actSlugFromName('Bharatiya Nyaya Sanhita, 2023')).toBe('bns')
    expect(actSlugFromName('Indian Penal Code, 1860')).toBe('ipc')
    expect(actSlugFromName('Indian Contract Act, 1872')).toBe('contract')
  })

  it('looks a section up by act name and number', () => {
    const s = getSectionByActNumber('Bharatiya Nyaya Sanhita, 2023', '103')
    expect(s?.id).toBe('bns:103')
    expect(s?.title).toBe('Punishment for murder')
  })

  it('does not confuse same-numbered sections across acts', () => {
    expect(getSection('bns:103')?.actFull).toContain('Bharatiya Nyaya Sanhita')
    expect(getSection('ipc:103')?.actFull).toContain('Indian Penal Code')
  })
})
