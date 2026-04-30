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

// Default response for the LLM status mount-fetch. Each test that uses
// mockResolvedValueOnce for its primary API call must queue this first so
// the LLM fetch consumes it instead of stealing the test's mock.
const llmStatusOk = () =>
  new Response(
    JSON.stringify({
      enabled: false,
      endpoint: 'http://localhost:11434',
      model: 'llama3.2:3b',
      reachable: false,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )

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
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(llmStatusOk())
      .mockResolvedValueOnce(
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
  })

  it('shows result counts after a successful import', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(llmStatusOk())
      .mockResolvedValueOnce(
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
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(llmStatusOk())
      .mockResolvedValueOnce(
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

  describe('Change passphrase', () => {
    const fillRekeyForm = (current: string, next: string, confirm: string) => {
      fireEvent.change(screen.getByLabelText(/current passphrase/i), {
        target: { value: current },
      })
      fireEvent.change(screen.getByLabelText(/^new passphrase/i), {
        target: { value: next },
      })
      fireEvent.change(screen.getByLabelText(/confirm new passphrase/i), {
        target: { value: confirm },
      })
    }

    it('shows an error when the new passphrase is too short', async () => {
      render(<SettingsPanel />)
      fillRekeyForm('current-pass', 'short', 'short')
      fireEvent.click(screen.getByRole('button', { name: /change passphrase/i }))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'New passphrase must be at least 8 characters.'
        )
      })
    })

    it('shows an error when the new passphrases do not match', async () => {
      render(<SettingsPanel />)
      fillRekeyForm('current-pass', 'long-enough', 'mismatch-too')
      fireEvent.click(screen.getByRole('button', { name: /change passphrase/i }))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('New passphrases do not match.')
      })
    })

    it('POSTs to /api/auth/rekey on a valid form and shows a success toast', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(llmStatusOk())
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        )

      render(<SettingsPanel />)
      fillRekeyForm('current-pass', 'new-pass-12', 'new-pass-12')
      fireEvent.click(screen.getByRole('button', { name: /change passphrase/i }))

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/auth/rekey',
          expect.objectContaining({ method: 'POST' })
        )
      })

      const rekeyCall = fetchSpy.mock.calls.find((c) => c[0] === '/api/auth/rekey')!
      const body = JSON.parse(
        (rekeyCall[1] as RequestInit).body as string
      ) as { current: string; next: string }
      expect(body).toEqual({ current: 'current-pass', next: 'new-pass-12' })
      expect(toast.success).toHaveBeenCalledWith('Passphrase changed.')
    })

    it('surfaces invalid_current_passphrase as a friendly toast', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(llmStatusOk())
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: false, error: 'invalid_current_passphrase' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
          )
        )

      render(<SettingsPanel />)
      fillRekeyForm('wrong-pass', 'new-pass-12', 'new-pass-12')
      fireEvent.click(screen.getByRole('button', { name: /change passphrase/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Current passphrase is wrong.')
      })
    })
  })
})
