import { vi } from 'vitest'

// Stub for next/navigation — vi.mock() in tests overrides these at runtime.
export const useRouter = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
})
export const useSearchParams = () => new URLSearchParams()
export const usePathname = () => '/'
export const useParams = () => ({})
export const redirect = vi.fn()
export const notFound = vi.fn()
