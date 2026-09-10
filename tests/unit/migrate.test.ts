import { describe, it, expect } from 'vitest'
import { migrate } from '@/lib/migrate'

describe('migrate', () => {
  it('returns a verified IPC→BNS mapping for a curated section', () => {
    const r = migrate('ipc->bns', '302')
    expect(r.verified).toBe(true)
    expect(r.source?.id).toBe('ipc:302')
    expect(r.target?.id).toBe('bns:103')
  })

  it('maps 420 IPC to the BNS cheating provision', () => {
    const r = migrate('ipc->bns', '420')
    expect(r.verified).toBe(true)
    expect(r.target?.id).toBe('bns:318')
  })

  it('supports the reverse direction', () => {
    const r = migrate('bns->ipc', '316')
    expect(r.verified).toBe(true)
    expect(r.target?.id).toBe('ipc:406')
  })

  it('offers unverified suggestions for a non-curated section', () => {
    const r = migrate('ipc->bns', '120')
    expect(r.verified).toBe(false)
    expect(r.source?.id).toBe('ipc:120')
    expect(r.candidates.length).toBeGreaterThan(0)
  })

  it('reports a missing input section', () => {
    const r = migrate('ipc->bns', '9999')
    expect(r.inputFound).toBe(false)
    expect(r.verified).toBe(false)
  })
})
