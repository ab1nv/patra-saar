import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LandingPage from '../app/page'

describe('Landing Page', () => {
  it('renders the headline', () => {
    render(<LandingPage />)
    expect(screen.getByText('Legal Clarity,')).toBeInTheDocument()
    expect(screen.getByText('Distilled.')).toBeInTheDocument()
  })

  it('has a sign in link', () => {
    render(<LandingPage />)
    const loginLink = screen.getByText('Sign In')
    expect(loginLink).toBeInTheDocument()
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })

  it('has a get started CTA', () => {
    render(<LandingPage />)
    const cta = screen.getByText('Get Started Free')
    expect(cta).toBeInTheDocument()
    expect(cta.closest('a')).toHaveAttribute('href', '/login')
  })

  it('renders all feature cards', () => {
    render(<LandingPage />)
    expect(screen.getByText('Upload Anything')).toBeInTheDocument()
    expect(screen.getByText('Ask Questions')).toBeInTheDocument()
    expect(screen.getByText('Cited Answers')).toBeInTheDocument()
    expect(screen.getByText('Completely Free')).toBeInTheDocument()
  })

  it('displays the legal disclaimer in the footer', () => {
    render(<LandingPage />)
    expect(screen.getByText(/does not constitute legal advice/)).toBeInTheDocument()
  })

  it('does not contain any em dashes', () => {
    const { container } = render(<LandingPage />)
    expect(container.textContent).not.toContain('\u2014')
  })
})
