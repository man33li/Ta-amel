import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAppStore, useTheme, useToggleTheme } from '@/stores/useAppStore'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useAppStore', () => {
  // Reset store to default state before each test
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    
    // Reset store to initial state
    useAppStore.setState({
      theme: 'light',
      accentColor: '#3b82f6',
      activeNoteId: null,
      sidebarOpen: true
    })
  })

  describe('Initial State', () => {
    it('should have light theme by default', () => {
      const state = useAppStore.getState()
      expect(state.theme).toBe('light')
    })

    it('should have default accent color (#3b82f6)', () => {
      const state = useAppStore.getState()
      expect(state.accentColor).toBe('#3b82f6')
    })

    it('should have null activeNoteId by default', () => {
      const state = useAppStore.getState()
      expect(state.activeNoteId).toBeNull()
    })

    it('should have sidebar open by default', () => {
      const state = useAppStore.getState()
      expect(state.sidebarOpen).toBe(true)
    })
  })

  describe('Theme Actions', () => {
    it('setTheme() should change theme to dark', () => {
      const { setTheme } = useAppStore.getState()
      
      act(() => {
        setTheme('dark')
      })
      
      expect(useAppStore.getState().theme).toBe('dark')
    })

    it('setTheme() should change theme to light', () => {
      // Start with dark theme
      useAppStore.setState({ theme: 'dark' })
      const { setTheme } = useAppStore.getState()
      
      act(() => {
        setTheme('light')
      })
      
      expect(useAppStore.getState().theme).toBe('light')
    })

    it('toggleTheme() should toggle from light to dark', () => {
      const { toggleTheme } = useAppStore.getState()
      
      act(() => {
        toggleTheme()
      })
      
      expect(useAppStore.getState().theme).toBe('dark')
    })

    it('toggleTheme() should toggle from dark to light', () => {
      useAppStore.setState({ theme: 'dark' })
      const { toggleTheme } = useAppStore.getState()
      
      act(() => {
        toggleTheme()
      })
      
      expect(useAppStore.getState().theme).toBe('light')
    })

    it('toggleTheme() should toggle multiple times correctly', () => {
      const { toggleTheme } = useAppStore.getState()
      
      expect(useAppStore.getState().theme).toBe('light')
      
      act(() => toggleTheme())
      expect(useAppStore.getState().theme).toBe('dark')
      
      act(() => toggleTheme())
      expect(useAppStore.getState().theme).toBe('light')
      
      act(() => toggleTheme())
      expect(useAppStore.getState().theme).toBe('dark')
    })
  })

  describe('Accent Color Actions', () => {
    it('setAccentColor() should update accent color', () => {
      const { setAccentColor } = useAppStore.getState()
      
      act(() => {
        setAccentColor('#ff0000')
      })
      
      expect(useAppStore.getState().accentColor).toBe('#ff0000')
    })

    it('setAccentColor() should accept any valid color string', () => {
      const { setAccentColor } = useAppStore.getState()
      
      const colors = ['#10b981', 'rgb(255, 0, 0)', 'hsl(120, 100%, 50%)']
      
      colors.forEach(color => {
        act(() => setAccentColor(color))
        expect(useAppStore.getState().accentColor).toBe(color)
      })
    })
  })

  describe('Active Note Actions', () => {
    it('setActiveNoteId() should set active note ID', () => {
      const { setActiveNoteId } = useAppStore.getState()
      
      act(() => {
        setActiveNoteId('note-123')
      })
      
      expect(useAppStore.getState().activeNoteId).toBe('note-123')
    })

    it('setActiveNoteId() should allow setting to null', () => {
      // First set a note
      useAppStore.setState({ activeNoteId: 'note-123' })
      const { setActiveNoteId } = useAppStore.getState()
      
      act(() => {
        setActiveNoteId(null)
      })
      
      expect(useAppStore.getState().activeNoteId).toBeNull()
    })
  })

  describe('Sidebar Actions', () => {
    it('setSidebarOpen() should set sidebar to open', () => {
      useAppStore.setState({ sidebarOpen: false })
      const { setSidebarOpen } = useAppStore.getState()
      
      act(() => {
        setSidebarOpen(true)
      })
      
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })

    it('setSidebarOpen() should set sidebar to closed', () => {
      const { setSidebarOpen } = useAppStore.getState()
      
      act(() => {
        setSidebarOpen(false)
      })
      
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })

    it('toggleSidebar() should toggle from open to closed', () => {
      const { toggleSidebar } = useAppStore.getState()
      
      act(() => {
        toggleSidebar()
      })
      
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })

    it('toggleSidebar() should toggle from closed to open', () => {
      useAppStore.setState({ sidebarOpen: false })
      const { toggleSidebar } = useAppStore.getState()
      
      act(() => {
        toggleSidebar()
      })
      
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })
  })

  describe('Selector Hooks', () => {
    it('useTheme() should return current theme', () => {
      const { result } = renderHook(() => useTheme())
      expect(result.current).toBe('light')
    })

    it('useTheme() should update when theme changes', () => {
      const { result } = renderHook(() => useTheme())
      
      act(() => {
        useAppStore.getState().setTheme('dark')
      })
      
      expect(result.current).toBe('dark')
    })

    it('useToggleTheme() should return toggle function', () => {
      const { result } = renderHook(() => useToggleTheme())
      expect(typeof result.current).toBe('function')
    })

    it('useToggleTheme() function should toggle theme when called', () => {
      const { result: toggleResult } = renderHook(() => useToggleTheme())
      const { result: themeResult } = renderHook(() => useTheme())
      
      expect(themeResult.current).toBe('light')
      
      act(() => {
        toggleResult.current()
      })
      
      expect(useAppStore.getState().theme).toBe('dark')
    })
  })
})
