import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Vitest configuration
  test: {
    environment: 'jsdom', // simulates a browser environment for tests
    globals: true, // allows using describe/it/expect without importing
    setupFiles: './src/test/setup.ts',
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