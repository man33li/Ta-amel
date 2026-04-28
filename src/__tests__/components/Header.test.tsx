import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Header } from '@/components/ui/Header'
import { useAppStore } from '@/stores/useAppStore'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
}))

describe('Header', () => {
  beforeEach(() => {
    // Reset theme to light for consistent tests
    useAppStore.setState({ theme: 'light' })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('first click on Lock shows "Confirm lock?" and does NOT call /api/auth/logout', () => {
    render(<Header />)

    const lockBtn = screen.getByRole('button', { name: 'Lock' })
    fireEvent.click(lockBtn)

    expect(screen.getByRole('button', { name: 'Confirm lock?' })).toBeInTheDocument()
    expect(screen.getByText('Confirm lock?')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalledWith('/api/auth/logout', expect.anything())
  })

  it('second click within 3s calls /api/auth/logout', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<Header />)

    fireEvent.click(screen.getByRole('button', { name: 'Lock' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm lock?' }))

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
  })

  it('after 3s without second click, label reverts to "Lock"', () => {
    render(<Header />)

    fireEvent.click(screen.getByRole('button', { name: 'Lock' }))
    expect(screen.getByText('Confirm lock?')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByRole('button', { name: 'Lock' })).toBeInTheDocument()
    expect(screen.getByText('Lock')).toBeInTheDocument()
  })
})
