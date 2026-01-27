import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ToastProvider } from '@/components/providers/ToastProvider'

describe('ToastProvider', () => {
  it('renders without crashing', () => {
    // This is a smoke test - ToastProvider is a thin wrapper around react-hot-toast
    expect(() => render(<ToastProvider />)).not.toThrow()
  })

  it('renders the Toaster component', () => {
    const { container } = render(<ToastProvider />)
    
    // react-hot-toast creates a div with role="region" or similar structure
    // The exact structure may vary, but it should render something
    expect(container).toBeDefined()
    expect(container.innerHTML).not.toBe('')
  })
})
