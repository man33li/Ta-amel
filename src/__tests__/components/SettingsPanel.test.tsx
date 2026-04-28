import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsPanel } from '@/components/settings/SettingsPanel'

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

import toast from 'react-hot-toast'

const mockImportSuccess = {
  ok: true,
  imported: { wings: 2, rooms: 3, cards: 10, embeddings: 10 },
  skipped: { wings: 0, rooms: 1, cards: 2, embeddings: 2 },
}

function makeFile(content: string, name = 'backup.json') {
  return new File([content], name, { type: 'application/json' })
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an Export section with a Download backup link', () => {
    render(<SettingsPanel />)
    const link = screen.getByRole('link', { name: /download backup/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/api/export')
  })

  it('renders a file input for import', () => {
    render(<SettingsPanel />)
    const input = screen.getByRole('button', { name: /restore/i })
    expect(input).toBeInTheDocument()
    // file input is present
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('accept', '.json,application/json')
  })

  it('clicking Restore without a file selected shows an error toast', async () => {
    render(<SettingsPanel />)
    fireEvent.click(screen.getByRole('button', { name: /restore/i }))
    expect(toast.error).toHaveBeenCalledWith('Select a backup file first.')
  })

  it('selecting a file and clicking Restore POSTs to /api/import', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockImportSuccess), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    render(<SettingsPanel />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = makeFile(JSON.stringify({ version: 1, wings: [], rooms: [], cards: [] }))
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
    fireEvent.change(fileInput)

    fireEvent.click(screen.getByRole('button', { name: /restore/i }))

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/import',
        expect.objectContaining({ method: 'POST' })
      )
    })

    fetchSpy.mockRestore()
  })

  it('shows result counts after a successful import', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockImportSuccess), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    render(<SettingsPanel />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = makeFile(JSON.stringify({ version: 1, wings: [], rooms: [], cards: [] }))
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
    fireEvent.change(fileInput)

    fireEvent.click(screen.getByRole('button', { name: /restore/i }))

    await waitFor(() => {
      expect(screen.getByText(/import complete/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/2 wings, 3 rooms, 10 cards/i)).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Backup restored successfully.')
  })

  it('shows an error toast when the API returns an error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, error: 'unsupported_version' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    )

    render(<SettingsPanel />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = makeFile('{}')
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
    fireEvent.change(fileInput)

    fireEvent.click(screen.getByRole('button', { name: /restore/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Backup version is not supported.')
    })

    expect(screen.queryByText(/import complete/i)).not.toBeInTheDocument()
  })
})
