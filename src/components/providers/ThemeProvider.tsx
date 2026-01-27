'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/stores/useAppStore'

/**
 * ThemeProvider - Applies theme class to document
 * 
 * Constraint-Based: The theme constraint propagates to all components
 * via CSS cascade (dark: modifier in Tailwind)
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme)

  useEffect(() => {
    // Apply theme class to document root
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
