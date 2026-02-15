import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '../app/login/page'

describe('Login Page', () => {
  it('renders the brand name', () => {
    render(<LoginPage />)
    expect(screen.getByText('PatraSaar')).toBeInTheDocument()
  })

  it('renders the Google sign in button', () => {
    render(<LoginPage />)
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })

  it('links to the BetterAuth Google OAuth endpoint', () => {
    render(<LoginPage />)
    const link = screen.getByText('Sign in with Google').closest('a')
    expect(link).toBeTruthy()
    expect(link?.getAttribute('href')).toContain('/api/auth/sign-in/social')
    expect(link?.getAttribute('href')).toContain('provider=google')
  })

  it('displays a disclaimer about not being legal advice', () => {
    render(<LoginPage />)
    expect(screen.getByText(/not legal advice/)).toBeInTheDocument()
  })
})
