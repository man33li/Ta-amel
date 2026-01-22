import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Simple test component
function HelloWorld({ name = 'World' }: { name?: string }) {
  return <div>Hello {name}</div>
}

// Interactive test component
function Counter() {
  const [count, setCount] = React.useState(0)
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  )
}

import React from 'react'

describe('Test Setup Verification', () => {
  it('renders a React component', () => {
    render(<HelloWorld />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders with props', () => {
    render(<HelloWorld name="MindForge" />)
    expect(screen.getByText('Hello MindForge')).toBeInTheDocument()
  })

  it('handles user interactions', async () => {
    const user = userEvent.setup()
    render(<Counter />)
    
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
    
    await user.click(screen.getByRole('button', { name: 'Increment' }))
    
    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })
})

describe('Jest-DOM Matchers', () => {
  it('toBeInTheDocument works', () => {
    render(<div data-testid="test">Test</div>)
    expect(screen.getByTestId('test')).toBeInTheDocument()
  })

  it('toHaveClass works', () => {
    render(<div data-testid="styled" className="bg-blue-500 text-white">Styled</div>)
    expect(screen.getByTestId('styled')).toHaveClass('bg-blue-500')
  })

  it('toBeVisible works', () => {
    render(<div data-testid="visible">Visible Element</div>)
    expect(screen.getByTestId('visible')).toBeVisible()
  })
})
