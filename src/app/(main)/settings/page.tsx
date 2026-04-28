import { SettingsPanel } from '@/components/settings/SettingsPanel'

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Settings</h1>
      <SettingsPanel />
    </div>
  )
}
