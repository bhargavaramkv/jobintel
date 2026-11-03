/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Content-Security-Policy for the production build. GitHub Pages can't set headers, so it ships as
 * a <meta> tag. Only same-origin scripts, styles, data and images; no third-party requests, no
 * framing of forms, no plugins. Dev builds skip it because Vite's dev server injects inline code.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

const csp = (): Plugin => ({
  name: 'jobintel-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
})

// JobIntel is deployed as a GitHub Pages *project* site at
// https://<user>.github.io/jobintel/, so assets must resolve under /jobintel/.
// Override with VITE_BASE_PATH only for a different repository name or a custom domain.
const base = process.env.VITE_BASE_PATH ?? '/jobintel/'

export default defineConfig({
  base,
  plugins: [react(), csp()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'collector/**/*.test.ts'],
    css: false,
  },
})
