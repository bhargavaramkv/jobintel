import type { Seed } from '../types'
import { MOCK_APPLICATIONS } from './applications'
import { MOCK_EVENTS } from './activity'
import { MOCK_JOBS } from './jobs'
import { EMPTY_PROFILE, MOCK_PROFILE } from './profile'
import { EMPTY_RESUMES, MOCK_RESUMES } from './resumes'
import { DEFAULT_SETTINGS } from './settings'

export const SEED: Seed = {
  onboarded: true,
  profile: MOCK_PROFILE,
  jobs: MOCK_JOBS,
  resumes: MOCK_RESUMES,
  applications: MOCK_APPLICATIONS,
  events: MOCK_EVENTS,
  settings: DEFAULT_SETTINGS,
}

export const EMPTY_SEED: Seed = {
  onboarded: false,
  profile: EMPTY_PROFILE,
  jobs: [],
  resumes: EMPTY_RESUMES,
  applications: [],
  events: [],
  settings: DEFAULT_SETTINGS,
}

export { RUN_SCRIPT } from './activity'
export { MOCK_PROFILE } from './profile'
