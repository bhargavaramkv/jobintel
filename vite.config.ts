/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// JobIntel is deployed as a GitHub Pages *project* site at
// https://<user>.github.io/jobintel/, so assets must resolve under /jobintel/.
// Override with VITE_BASE_PATH only for a different repository name or a custom domain.
const base = process.env.VITE_BASE_PATH ?? '/jobintel/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
