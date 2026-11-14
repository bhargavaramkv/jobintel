import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

export const feed = JSON.parse(readFileSync('public/data/jobs.json', 'utf8')) as { jobs: Array<{ id: string; title: string; status: string; url: string }> }
export const OPEN = feed.jobs.filter((j) => j.status === 'open')
export const FIRST_JOB = OPEN[0]
export const JOB_HASH = `#/jobs/${encodeURIComponent(FIRST_JOB.id)}`

/** A saved profile and one tracked job, written before the app starts, so populated screens are checked too. */
export const SEED = {
  profile: {
    id: 'current-user',
    displayName: 'Test User',
    currentTitle: 'Software Engineer',
    yearsExperience: 4,
    professionalSummary: 'Builds backend services.',
    primarySkills: [{ name: 'C#' }, { name: '.NET' }, { name: 'SQL Server' }],
    secondarySkills: [{ name: 'Docker' }],
    targetRoles: ['Backend Engineer'],
    targetSeniority: ['SDE-2'],
    excludedTitles: [],
    preferredLocations: ['Bengaluru'],
    workModes: ['hybrid', 'onsite', 'remote'],
    willingToRelocate: false,
    companyTypes: ['product'],
    targetCompanies: [],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  resume: {
    name: 'master.tex',
    size: 120,
    uploadedAt: '2026-11-12T10:00:00.000Z',
    tex: '\\documentclass{article}\n\\begin{document}\nSample\n\\end{document}\n',
  },
  tracked: [
    { jobId: FIRST_JOB.id, title: FIRST_JOB.title, company: 'Example', url: FIRST_JOB.url, trackedAt: '2026-11-13T00:00:00.000Z', status: 'applied', notes: 'Waiting to hear back' },
  ],
  prefs: { minScore: 40 },
}

export async function seed(page: Page) {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('jobintel:v2')) localStorage.setItem('jobintel:v2', JSON.stringify(state))
  }, SEED)
}
