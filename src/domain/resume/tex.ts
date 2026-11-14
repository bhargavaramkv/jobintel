export const MAX_TEX_BYTES = 200 * 1024

export type TexValidation = { ok: true } | { ok: false; error: string }

/** Client-side checks for an uploaded master resume. Nothing is compiled or sent anywhere. */
export function validateTexUpload(name: string, size: number, text: string): TexValidation {
  if (!name.toLowerCase().endsWith('.tex')) return { ok: false, error: 'Upload a .tex file (LaTeX source).' }
  if (size > MAX_TEX_BYTES) return { ok: false, error: 'The file is larger than 200 KB.' }
  if (text.trim().length === 0) return { ok: false, error: 'The file is empty.' }
  if (!text.includes('\\documentclass')) return { ok: false, error: 'Missing \\documentclass. This does not look like a LaTeX resume.' }
  if (!text.includes('\\begin{document}')) return { ok: false, error: 'Missing \\begin{document}. This does not look like a LaTeX resume.' }
  return { ok: true }
}
