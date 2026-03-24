import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  define: {
    // sockjs-client expects Node's global in browser builds
    global: 'globalThis',
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Vitest configuration
  test: {
    environment: 'jsdom', // simulates a browser environment for tests
    globals: true, // allows using describe/it/expect without importing
    setupFiles: './src/test/setup.ts',
    exclude: [...configDefaults.exclude, 'e2e/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 10,
        statements: 20,
      },
    },
  },
})