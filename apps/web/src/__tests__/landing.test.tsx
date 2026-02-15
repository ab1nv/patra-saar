import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LandingPage from '../app/page'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...filterMotionProps(props)}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...filterMotionProps(props)}>{children}</p>,
    h1: ({ children, ...props }: any) => <h1 {...filterMotionProps(props)}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...filterMotionProps(props)}>{children}</h2>,
    article: ({ children, ...props }: any) => <article {...filterMotionProps(props)}>{children}</article>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Strip motion-specific props that don't belong on DOM elements
function filterMotionProps(props: Record<string, any>) {
  const motionKeys = ['initial', 'animate', 'exit', 'variants', 'custom', 'whileInView', 'whileHover', 'viewport', 'transition']
  const filtered: Record<string, any> = {}
  for (const [key, val] of Object.entries(props)) {
    if (!motionKeys.includes(key)) filtered[key] = val
  }
  return filtered
}

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}))

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

  it('has a How It Works section', () => {
    render(<LandingPage />)
    const elements = screen.getAllByText('How It Works')
    expect(elements.length).toBeGreaterThanOrEqual(2) // nav link + section heading
    expect(screen.getByText('Upload your document')).toBeInTheDocument()
    expect(screen.getByText('Ask anything')).toBeInTheDocument()
  })

  it('has a How It Works nav link', () => {
    render(<LandingPage />)
    const link = screen.getByText('How It Works', { selector: 'a' })
    expect(link).toHaveAttribute('href', '#how-it-works')
  })

  it('displays the logo image', () => {
    render(<LandingPage />)
    const logo = screen.getByAltText('PatraSaar')
    expect(logo).toBeInTheDocument()
  })

  it('displays the legal disclaimer in the footer', () => {
    render(<LandingPage />)
    expect(screen.getByText(/does not constitute legal advice/)).toBeInTheDocument()
  })
})
