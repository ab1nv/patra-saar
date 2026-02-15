import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from '../app/login/page'

// Mock window.location
const mockLocationAssign = vi.fn()
Object.defineProperty(window, 'location', {
  value: { href: '', origin: 'http://localhost:3000' },
  writable: true,
})

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the brand name', () => {
    render(<LoginPage />)
    expect(screen.getByText('PatraSaar')).toBeInTheDocument()
  })

  it('renders the Google sign in button', () => {
    render(<LoginPage />)
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })

  it('displays a disclaimer about not being legal advice', () => {
    render(<LoginPage />)
    expect(screen.getByText(/not legal advice/)).toBeInTheDocument()
  })

  it('shows loading state when clicked', () => {
    render(<LoginPage />)
    const button = screen.getByText('Sign in with Google')
    fireEvent.click(button)
    expect(screen.getByText('Redirecting...')).toBeInTheDocument()
  })
})
