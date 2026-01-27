import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * App-wide state store
 * 
 * COP: Flat data structure, concrete state
 * - Theme: light/dark mode
 * - Accent color: customizable brand color
 * - UI state: active note tracking
 * 
 * Constraint-Based: Theme is a constraint that all components must satisfy
 */

interface AppState {
  // Theme (persisted)
  theme: 'light' | 'dark'
  accentColor: string
  
  // UI State (ephemeral)
  activeNoteId: string | null
  sidebarOpen: boolean
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  setAccentColor: (color: string) => void
  setActiveNoteId: (id: string | null) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme defaults
      theme: 'light',
      accentColor: '#3b82f6', // Tailwind blue-500
      
      // UI State defaults
      activeNoteId: null,
      sidebarOpen: true,
      
      // Theme actions
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      setAccentColor: (accentColor) => set({ accentColor }),
      
      // UI actions
      setActiveNoteId: (activeNoteId) => set({ activeNoteId }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
    }),
    {
      name: 'mindforge-app-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist theme-related state, not UI state
      partialize: (state) => ({
        theme: state.theme,
        accentColor: state.accentColor,
      }),
    }
  )
)

// Selector hooks for common access patterns (COP: extract only after patterns repeat)
export const useTheme = () => useAppStore((state) => state.theme)
export const useToggleTheme = () => useAppStore((state) => state.toggleTheme)
