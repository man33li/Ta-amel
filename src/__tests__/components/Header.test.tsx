import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '@/components/ui/Header'
import { useAppStore } from '@/stores/useAppStore'

describe('Header', () => {
  beforeEach(() => {
    // Reset theme to light for consistent tests
    useAppStore.setState({ theme: 'light' })
  })

  it('renders as header element (banner role)', () => {
    render(<Header />)
    
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders logo link to home page', () => {
    render(<Header />)
    
    const logoLink = screen.getByRole('link', { name: /mindforge/i })
    expect(logoLink).toHaveAttribute('href', '/')
  })

  it('displays MindForge brand text', () => {
    render(<Header />)
    
    expect(screen.getByText('MindForge')).toBeInTheDocument()
  })

  it('contains ThemeToggle component', () => {
    render(<Header />)
    
    // ThemeToggle renders a button with aria-label containing "switch to"
    expect(screen.getByRole('button', { name: /switch to/i })).toBeInTheDocument()
  })

  it('header has sticky positioning class', () => {
    render(<Header />)
    
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('sticky', 'top-0')
  })
})
