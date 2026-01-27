'use client'

import { Toaster } from 'react-hot-toast'

/**
 * ToastProvider - Global toast notifications
 */
export function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        // Default styles
        className: 'text-sm',
        duration: 3000,
        // Light mode
        style: {
          background: '#fff',
          color: '#374151',
          border: '1px solid #e5e7eb',
        },
      }}
      containerStyle={{
        bottom: 40,
      }}
    />
  )
}
