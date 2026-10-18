import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only auto-cleans up when Vitest globals are enabled (https://testing-library.com/docs/react-testing-library/setup#auto-cleanup-in-vitest)
afterEach(cleanup)
