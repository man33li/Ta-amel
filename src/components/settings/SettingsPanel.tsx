'use client'

import { useRef, useState } from 'react'
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

export function SettingsPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

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
    </div>
  )
}
