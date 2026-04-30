'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

interface ImportResult {
  imported: { wings: number; rooms: number; cards: number; embeddings: number }
  skipped: { wings: number; rooms: number; cards: number; embeddings: number }
}

const ERROR_LABELS: Record<string, string> = {
  invalid_json: 'The file is not valid JSON.',
  unsupported_version: 'Backup version is not supported.',
  invalid_payload: 'The file does not look like a MindForge backup.',
}

const REKEY_ERROR_LABELS: Record<string, string> = {
  fields_required: 'Fill in both passphrases.',
  invalid_current_passphrase: 'Current passphrase is wrong.',
  passphrase_too_short: 'New passphrase must be at least 8 characters.',
  rekey_failed: 'Could not change passphrase. Your data is unchanged.',
}

export function SettingsPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const [current, setCurrent] = useState('')
  const [nextPass, setNextPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [rekeying, setRekeying] = useState(false)

  const [llm, setLlm] = useState<{
    enabled: boolean
    endpoint: string
    model: string
    reachable: boolean
  } | null>(null)
  const [llmSaving, setLlmSaving] = useState(false)

  useEffect(() => {
    fetch('/api/llm/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b) setLlm(b)
      })
  }, [])

  const saveLlm = async (patch: Partial<NonNullable<typeof llm>>) => {
    setLlmSaving(true)
    try {
      const res = await fetch('/api/llm/status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) setLlm(await res.json())
      else toast.error('Could not save LLM settings.')
    } finally {
      setLlmSaving(false)
    }
  }

  const handleRekey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!current || !nextPass) {
      toast.error(REKEY_ERROR_LABELS.fields_required)
      return
    }
    if (nextPass.length < 8) {
      toast.error(REKEY_ERROR_LABELS.passphrase_too_short)
      return
    }
    if (nextPass !== confirmPass) {
      toast.error('New passphrases do not match.')
      return
    }

    setRekeying(true)
    try {
      const res = await fetch('/api/auth/rekey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ current, next: nextPass }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.ok === false) {
        const label = REKEY_ERROR_LABELS[data.error] ?? 'Could not change passphrase.'
        toast.error(label)
      } else {
        toast.success('Passphrase changed.')
        setCurrent('')
        setNextPass('')
        setConfirmPass('')
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setRekeying(false)
    }
  }

  const readFileText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })

  const handleRestore = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.error('Select a backup file first.')
      return
    }

    setImporting(true)
    setResult(null)

    try {
      const text = await readFileText(file)
      const res = await fetch('/api/import', {
        method: 'POST',
        body: text,
        headers: { 'content-type': 'application/json' },
      })
      const data = await res.json()

      if (!res.ok || data.ok === false) {
        const label = ERROR_LABELS[data.error] ?? `Import failed: ${data.error ?? 'unknown error'}`
        toast.error(label)
      } else {
        setResult({ imported: data.imported, skipped: data.skipped })
        toast.success('Backup restored successfully.')
      }
    } catch {
      toast.error('Could not read the backup file.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Export */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Export</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Download all your notes, wings, rooms, and embeddings as a single JSON file.
        </p>
        <a
          href="/api/export"
          download
          className="inline-block px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Download backup
        </a>
      </section>

      {/* Import */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Import</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Restore from a previously exported backup. Existing records with matching IDs are skipped.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 dark:file:bg-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-600 file:transition-colors"
          />
          <button
            onClick={handleRestore}
            disabled={importing}
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {importing ? 'Restoring…' : 'Restore'}
          </button>
        </div>

        {result && (
          <div className="mt-4 rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-200">
            <p className="font-medium mb-1">Import complete</p>
            <p>
              Imported: {result.imported.wings} wings, {result.imported.rooms} rooms,{' '}
              {result.imported.cards} cards, {result.imported.embeddings} embeddings
            </p>
            <p>
              Skipped: {result.skipped.wings} wings, {result.skipped.rooms} rooms,{' '}
              {result.skipped.cards} cards, {result.skipped.embeddings} embeddings
            </p>
          </div>
        )}
      </section>

      {/* Local LLM */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Local LLM (optional)
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Off by default. When enabled, MindForge can call a locally-running
          Ollama instance to summarize notes and rerank search results. Nothing
          leaves your machine.
        </p>

        {llm && (
          <div className="space-y-3 max-w-md">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={llm.enabled}
                disabled={llmSaving}
                onChange={(e) => saveLlm({ enabled: e.target.checked })}
              />
              <span>Enable LLM features</span>
              {llm.enabled && (
                <span
                  className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    llm.reachable
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}
                >
                  {llm.reachable ? 'reachable' : 'unreachable'}
                </span>
              )}
            </label>

            <div>
              <label
                htmlFor="llm-endpoint"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Ollama endpoint
              </label>
              <input
                id="llm-endpoint"
                type="text"
                defaultValue={llm.endpoint}
                onBlur={(e) => {
                  if (e.target.value !== llm.endpoint) saveLlm({ endpoint: e.target.value })
                }}
                placeholder="http://localhost:11434"
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="llm-model"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Model
              </label>
              <input
                id="llm-model"
                type="text"
                defaultValue={llm.model}
                onBlur={(e) => {
                  if (e.target.value !== llm.model) saveLlm({ model: e.target.value })
                }}
                placeholder="llama3.2:3b"
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => saveLlm({})}
              disabled={llmSaving}
              className="px-3 py-1.5 text-sm rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
            >
              Test connection
            </button>
          </div>
        )}
      </section>

      {/* Change passphrase */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Change passphrase
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Re-encrypts your database in place. The old passphrase stops working
          on the next process restart. Pick something you can remember — there
          is still no recovery.
        </p>
        <form onSubmit={handleRekey} className="space-y-3 max-w-md">
          <div>
            <label
              htmlFor="rekey-current"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Current passphrase
            </label>
            <input
              id="rekey-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="rekey-next"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New passphrase (min 8 characters)
            </label>
            <input
              id="rekey-next"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={nextPass}
              onChange={(e) => setNextPass(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="rekey-confirm"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirm new passphrase
            </label>
            <input
              id="rekey-confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={rekeying}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {rekeying ? 'Re-encrypting…' : 'Change passphrase'}
          </button>
        </form>
      </section>
    </div>
  )
}
