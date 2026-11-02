import { IDBFactory } from 'fake-indexeddb'
import { resetDatabaseConnection } from '../storage/db'
import { createEmptyProfile, type CandidateProfile } from '../domain/profile/schema'

/** Give each test an isolated, empty IndexedDB. */
export async function freshDatabase(): Promise<void> {
  await resetDatabaseConnection()
  globalThis.indexedDB = new IDBFactory()
}

export function makeProfile(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return { ...createEmptyProfile(new Date('2026-01-01T00:00:00.000Z')), ...overrides }
}

/** A profile that satisfies every readiness rule. Values are generic test data, not a real person. */
export function completeProfile(): CandidateProfile {
  return makeProfile({
    displayName: 'Test User',
    currentTitle: 'Software Engineer',
    yearsExperience: 3,
    professionalSummary: 'Builds backend services.',
    primarySkills: [{ name: 'C#' }, { name: 'SQL' }, { name: 'React', proficiency: 'working' }],
    secondarySkills: [{ name: 'Docker' }],
    targetRoles: ['Backend Engineer'],
    targetSeniority: ['SDE-2'],
    preferredLocations: ['Remote'],
    workModes: ['remote'],
    companyTypes: ['product'],
  })
}
