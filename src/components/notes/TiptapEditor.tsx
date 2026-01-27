'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

interface TiptapEditorProps {
  content: Record<string, unknown>
  onUpdate: (content: Record<string, unknown>) => void
  placeholder?: string
}

/**
 * TiptapEditor - Rich text editor component
 * 
 * COP: Direct implementation with concrete toolbar
 * - Bold, Italic, Strikethrough
 * - Bullet lists, Ordered lists
 * - Headings (H1, H2)
 * 
 * Note: `immediatelyRender: false` is required for Next.js SSR
 */
export function TiptapEditor({ content, onUpdate, placeholder = 'Start typing...' }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure StarterKit options if needed
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    immediatelyRender: false, // Required for Next.js SSR compatibility
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON() as Record<string, unknown>)
    },
  })

  // Sync content when prop changes (e.g., loading note data)
  useEffect(() => {
    if (editor && content && Object.keys(content).length > 0) {
      // Only update if content is different to prevent cursor jumping
      const currentContent = JSON.stringify(editor.getJSON())
      const newContent = JSON.stringify(content)
      if (currentContent !== newContent) {
        editor.commands.setContent(content)
      }
    }
  }, [editor, content])

  if (!editor) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden animate-pulse">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" />
        <div className="h-64 bg-gray-50 dark:bg-gray-900" />
      </div>
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <Toolbar editor={editor} />
      
      {/* Editor Content */}
      <EditorContent 
        editor={editor}
        className="prose dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none
                   prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                   prose-p:my-2 prose-ul:my-2 prose-ol:my-2"
      />
    </div>
  )
}

/**
 * Toolbar component with formatting buttons
 */
function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      {/* Text Style */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <StrikeIcon />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <BulletListIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <OrderedListIcon />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Block Quote & Code */}
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <QuoteIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <CodeIcon />
        </ToolbarButton>
      </ToolbarGroup>
    </div>
  )
}

// ============================================================================
// Toolbar Helper Components
// ============================================================================

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-0.5">{children}</div>
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />
}

interface ToolbarButtonProps {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        px-2 py-1.5 rounded text-sm font-medium transition-colors
        ${active 
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }
      `}
    >
      {children}
    </button>
  )
}

// ============================================================================
// Icons (inline SVG for simplicity - COP: concrete, no external deps)
// ============================================================================

function BoldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6zM6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
    </svg>
  )
}

function ItalicIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0l-4 16m0 0h4" />
    </svg>
  )
}

function StrikeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h12M9 4h6m-6 16h6m-3-8V4m0 12v4" />
    </svg>
  )
}

function BulletListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="2" cy="6" r="1" fill="currentColor" />
      <circle cx="2" cy="12" r="1" fill="currentColor" />
      <circle cx="2" cy="18" r="1" fill="currentColor" />
    </svg>
  )
}

function OrderedListIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <text x="2" y="8" fontSize="6">1.</text>
      <text x="2" y="14" fontSize="6">2.</text>
      <text x="2" y="20" fontSize="6">3.</text>
      <line x1="10" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function QuoteIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  )
}
