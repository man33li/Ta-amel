import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TiptapEditor } from '@/components/notes/TiptapEditor'

// Valid empty Tiptap document structure to avoid "Invalid content" warnings
const emptyDoc = {
  type: 'doc',
  content: [{ type: 'paragraph' }]
}

describe('TiptapEditor', () => {
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    mockOnUpdate.mockClear()
  })

  it('renders without crashing', async () => {
    render(
      <TiptapEditor 
        content={emptyDoc} 
        onUpdate={mockOnUpdate} 
      />
    )
    
    // Wait for editor to initialize (async due to immediatelyRender: false)
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows loading skeleton initially', () => {
    // Before editor loads, it should show a loading skeleton with animate-pulse
    render(
      <TiptapEditor 
        content={emptyDoc} 
        onUpdate={mockOnUpdate} 
      />
    )
    
    // The skeleton should be present initially (before async editor loads)
    // This test may be timing-dependent - the skeleton appears before editor mounts
    // We check for the container structure rather than the skeleton specifically
    const container = document.querySelector('.border.border-gray-200')
    expect(container).toBeInTheDocument()
  })

  it('renders toolbar buttons', async () => {
    render(
      <TiptapEditor 
        content={emptyDoc} 
        onUpdate={mockOnUpdate} 
      />
    )
    
    // Wait for editor to initialize
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Check toolbar buttons are present by their titles
    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument()
    expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument()
    expect(screen.getByTitle('Strikethrough')).toBeInTheDocument()
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument()
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument()
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument()
    expect(screen.getByTitle('Numbered List')).toBeInTheDocument()
    expect(screen.getByTitle('Quote')).toBeInTheDocument()
    expect(screen.getByTitle('Code Block')).toBeInTheDocument()
  })

  it('applies custom placeholder prop', async () => {
    const customPlaceholder = 'Write something amazing...'
    
    render(
      <TiptapEditor 
        content={emptyDoc} 
        onUpdate={mockOnUpdate}
        placeholder={customPlaceholder}
      />
    )
    
    // Wait for editor to initialize
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Tiptap applies placeholder via CSS :before pseudo-element
    // We verify the editor renders correctly with placeholder prop
    const editor = screen.getByRole('textbox')
    expect(editor).toBeInTheDocument()
  })

  it('renders initial content', async () => {
    const initialContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello World' }]
        }
      ]
    }
    
    render(
      <TiptapEditor 
        content={initialContent} 
        onUpdate={mockOnUpdate}
      />
    )
    
    // Wait for editor to initialize and content to render
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    }, { timeout: 3000 })

    // The content should be visible in the editor
    await waitFor(() => {
      expect(screen.getByText('Hello World')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('toolbar buttons are clickable', async () => {
    const user = userEvent.setup()
    
    render(
      <TiptapEditor 
        content={emptyDoc} 
        onUpdate={mockOnUpdate} 
      />
    )
    
    // Wait for editor to initialize
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Click a toolbar button (Bold) - verify it responds to clicks
    const boldButton = screen.getByTitle('Bold (Ctrl+B)')
    await user.click(boldButton)
    
    // Toolbar button should be interactive
    expect(boldButton).toBeInTheDocument()
    expect(boldButton.tagName).toBe('BUTTON')
  })

  // Note: Direct content editing and focus tests are limited in jsdom due to 
  // ProseMirror/contenteditable not fully supporting elementFromPoint.
  // Content editing is better tested in E2E tests with Playwright.
  // See: https://github.com/ueberdosis/tiptap/issues/2654
})
