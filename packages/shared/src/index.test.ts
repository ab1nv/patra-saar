import { describe, it, expect } from 'vitest'
import {
  createChatSchema,
  updateChatSchema,
  sendMessageSchema,
  isAllowedFileType,
  isAllowedExtension,
  isWithinSizeLimit,
  MAX_FILE_SIZE_BYTES,
  LEGAL_DISCLAIMER,
} from './index'

describe('chat schemas', () => {
  it('validates createChatSchema with optional title', () => {
    expect(createChatSchema.parse({})).toEqual({})
    expect(createChatSchema.parse({ title: 'My chat' })).toEqual({ title: 'My chat' })
  })

  it('rejects empty string title in createChatSchema', () => {
    expect(() => createChatSchema.parse({ title: '' })).toThrow()
  })

  it('validates updateChatSchema', () => {
    expect(updateChatSchema.parse({ title: 'Renamed' })).toEqual({ title: 'Renamed' })
  })

  it('rejects updateChatSchema without title', () => {
    expect(() => updateChatSchema.parse({})).toThrow()
  })
})

describe('message schemas', () => {
  it('validates sendMessageSchema with content', () => {
    const result = sendMessageSchema.parse({ content: 'What is Section 12?' })
    expect(result.content).toBe('What is Section 12?')
  })

  it('allows empty sendMessageSchema when file is attached separately', () => {
    expect(sendMessageSchema.parse({})).toEqual({})
  })

  it('rejects content over 10000 chars', () => {
    expect(() => sendMessageSchema.parse({ content: 'a'.repeat(10001) })).toThrow()
  })
})

describe('file validation', () => {
  it('allows valid MIME types', () => {
    expect(isAllowedFileType('application/pdf')).toBe(true)
    expect(isAllowedFileType('text/plain')).toBe(true)
    expect(isAllowedFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
  })

  it('rejects invalid MIME types', () => {
    expect(isAllowedFileType('image/png')).toBe(false)
    expect(isAllowedFileType('application/javascript')).toBe(false)
    expect(isAllowedFileType('')).toBe(false)
  })

  it('allows valid file extensions', () => {
    expect(isAllowedExtension('contract.pdf')).toBe(true)
    expect(isAllowedExtension('readme.txt')).toBe(true)
    expect(isAllowedExtension('file.DOCX')).toBe(true)
    expect(isAllowedExtension('old.doc')).toBe(true)
  })

  it('rejects invalid extensions', () => {
    expect(isAllowedExtension('script.js')).toBe(false)
    expect(isAllowedExtension('photo.png')).toBe(false)
    expect(isAllowedExtension('noextension')).toBe(false)
  })

  it('enforces 10MB size limit', () => {
    expect(isWithinSizeLimit(1024)).toBe(true)
    expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES)).toBe(true)
    expect(isWithinSizeLimit(MAX_FILE_SIZE_BYTES + 1)).toBe(false)
  })
})

describe('constants', () => {
  it('has a legal disclaimer without em dashes', () => {
    expect(LEGAL_DISCLAIMER).toBeTruthy()
    expect(LEGAL_DISCLAIMER).not.toContain('\u2014') // no em dashes
  })
})
