import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/__tests__/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // next/link and next/navigation have no JS in this env — stub them for Vite's resolver.
      // vi.mock() in setup.ts / individual tests still overrides behavior at test time.
      'next/link': path.resolve(__dirname, './src/__tests__/mocks/next-link.tsx'),
      'next/navigation': path.resolve(__dirname, './src/__tests__/mocks/next-navigation.ts'),
    },
  },
})
