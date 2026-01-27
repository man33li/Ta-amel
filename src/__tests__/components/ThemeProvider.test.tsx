import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { useAppStore } from '@/stores/useAppStore'

describe('ThemeProvider', () => {
  // Clean up document classes before and after each test
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    useAppStore.setState({ theme: 'light' })
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('renders children correctly', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Child content</div>
      </ThemeProvider>
    )
    
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('applies dark class to document when theme is dark', () => {
    useAppStore.setState({ theme: 'dark' })
    
    render(
      <ThemeProvider>
        <div>content</div>
      </ThemeProvider>
    )
    
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class from document when theme is light', () => {
    // First, add dark class manually
    document.documentElement.classList.add('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    
    // Theme is 'light' (default from beforeEach)
    render(
      <ThemeProvider>
        <div>content</div>
      </ThemeProvider>
    )
    
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('does not have dark class when theme is light initially', () => {
    render(
      <ThemeProvider>
        <div>content</div>
      </ThemeProvider>
    )
    
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
