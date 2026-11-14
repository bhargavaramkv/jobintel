import { describe, expect, it } from 'vitest'
import { SAMPLE_TEX } from '../../test/resumeFixture'
import { inferFromTex } from './infer'

describe('inferFromTex', () => {
  it('reads roles, seniority and skills from the master resume', () => {
    const r = inferFromTex(SAMPLE_TEX)
    expect(r.targetRoles).toEqual(['Software Engineer', 'Full-stack Engineer'])
    expect(r.targetSeniority).toEqual(['SDE-2'])
    expect(r.primarySkills).toEqual(expect.arrayContaining(['C#', '.NET', 'React', 'TypeScript', 'Docker']))
    expect(r.primarySkills.length).toBeLessThanOrEqual(8)
  })

  it('keeps skills that appear only outside the Skills section as secondary', () => {
    const tex = String.raw`\documentclass{article}\begin{document}
\section{Skills}
\textbf{Core:} C\#, SQL Server
\section{Experience}
\role{Backend Engineer I}{Acme}{2023 -- Present}
\begin{itemize}\item Built Kafka consumers and Redis caches\end{itemize}
\end{document}`
    const r = inferFromTex(tex)
    expect(r.primarySkills).toEqual(['C#', 'SQL Server'])
    expect(r.secondarySkills).toEqual(expect.arrayContaining(['Kafka', 'Redis']))
    expect(r.primarySkills).not.toContain('Kafka')
    expect(r.targetRoles).toEqual(['Backend Engineer'])
    expect(r.targetSeniority).toEqual(['SDE-1'])
  })

  it('does not match a skill inside a longer word', () => {
    const tex = String.raw`\documentclass{article}\begin{document}\section{Experience}\role{Engineer}{X}{2024}Golden Gate, JavaScripting\end{document}`
    const r = inferFromTex(tex)
    expect(r.primarySkills).toEqual([])
    expect(r.secondarySkills).toEqual([])
  })
})
