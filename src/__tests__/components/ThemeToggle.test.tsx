import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAppStore } from '@/stores/useAppStore'

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Reset theme to light before each test
    useAppStore.setState({ theme: 'light' })
  })

  it('renders a button element', () => {
    render(<ThemeToggle />)
    
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has appropriate aria-label for accessibility when in light mode', () => {
    useAppStore.setState({ theme: 'light' })
    render(<ThemeToggle />)
    
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Switch to dark mode'
    )
  })

  it('has appropriate aria-label for accessibility when in dark mode', () => {
    useAppStore.setState({ theme: 'dark' })
    render(<ThemeToggle />)
    
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Switch to light mode'
    )
  })

  it('toggles theme from light to dark when clicked', async () => {
    const user = userEvent.setup()
    useAppStore.setState({ theme: 'light' })
    render(<ThemeToggle />)
    
    expect(useAppStore.getState().theme).toBe('light')
    
    await user.click(screen.getByRole('button'))
    
    expect(useAppStore.getState().theme).toBe('dark')
  })

  it('toggles theme from dark to light when clicked', async () => {
    const user = userEvent.setup()
    useAppStore.setState({ theme: 'dark' })
    render(<ThemeToggle />)
    
    expect(useAppStore.getState().theme).toBe('dark')
    
    await user.click(screen.getByRole('button'))
    
    expect(useAppStore.getState().theme).toBe('light')
  })

  it('shows moon icon when theme is light (to switch to dark)', () => {
    useAppStore.setState({ theme: 'light' })
    render(<ThemeToggle />)
    
    // Moon icon has the path for dark mode activation
    const button = screen.getByRole('button')
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('text-gray-600')
  })

  it('shows sun icon when theme is dark (to switch to light)', () => {
    useAppStore.setState({ theme: 'dark' })
    render(<ThemeToggle />)
    
    // Sun icon has yellow color for light mode activation  
    const button = screen.getByRole('button')
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('text-yellow-400')
  })
})
