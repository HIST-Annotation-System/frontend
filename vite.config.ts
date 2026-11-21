/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Unit tests only: e2e/ holds Playwright specs, run with `npm run e2e`.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
