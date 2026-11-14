import { describe, expect, it } from 'vitest'
import { validateTexUpload } from './tex'

const GOOD = '\\documentclass{article}\n\\begin{document}\nHi\n\\end{document}'

describe('validateTexUpload', () => {
  it('accepts a valid .tex file', () => {
    expect(validateTexUpload('cv.tex', GOOD.length, GOOD)).toEqual({ ok: true })
  })
  it('rejects non-.tex files', () => {
    expect(validateTexUpload('cv.pdf', 10, GOOD)).toMatchObject({ ok: false })
  })
  it('rejects oversized and empty files', () => {
    expect(validateTexUpload('cv.tex', 200 * 1024 + 1, GOOD)).toMatchObject({ ok: false })
    expect(validateTexUpload('cv.tex', 0, '  ')).toMatchObject({ ok: false })
  })
  it('rejects text without documentclass or begin{document}', () => {
    expect(validateTexUpload('cv.tex', 20, '\\begin{document}')).toMatchObject({ ok: false })
    expect(validateTexUpload('cv.tex', 20, '\\documentclass{article}')).toMatchObject({ ok: false })
  })
})
