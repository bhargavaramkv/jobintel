import { createEmptyProfile, type CandidateProfile } from '../../domain/profile/schema'
import { minutesAgo } from '../clock'

/** Fictional candidate used only by the prototype. */
export const MOCK_PROFILE: CandidateProfile = {
  id: 'current-user',
  displayName: 'Arjun Rao',
  currentTitle: 'Software Engineer II',
  currentCompany: 'Finlane Systems',
  yearsExperience: 4,
  professionalSummary:
    'Backend-leaning full-stack engineer with four years building payment and ledger services in C# and .NET, plus React front ends. Comfortable owning a service from schema to deployment.',
  primarySkills: [
    { name: 'C#', proficiency: 'strong' },
    { name: '.NET', proficiency: 'strong' },
    { name: 'SQL', proficiency: 'strong' },
    { name: 'React', proficiency: 'working' },
    { name: 'TypeScript', proficiency: 'working' },
  ],
  secondarySkills: [
    { name: 'Docker', proficiency: 'working' },
    { name: 'Azure', proficiency: 'familiar' },
    { name: 'Redis', proficiency: 'familiar' },
    { name: 'SQL Server', proficiency: 'strong' },
    { name: 'REST', proficiency: 'strong' },
    { name: 'PostgreSQL', proficiency: 'working' },
  ],
  targetRoles: ['Backend Engineer', 'Full-stack Engineer', '.NET Developer'],
  targetSeniority: ['SDE-2', 'Mid-level'],
  excludedTitles: ['Intern'],
  preferredLocations: ['Bengaluru', 'Hyderabad'],
  workModes: ['hybrid', 'remote'],
  willingToRelocate: false,
  companyTypes: ['product', 'startup'],
  targetCompanies: [],
  compensation: { currency: 'INR', minimum: 2400000, maximum: 3600000 },
  noticePeriod: '30 days',
  createdAt: minutesAgo(60 * 24 * 30),
  updatedAt: minutesAgo(60 * 24 * 2),
}

export const EMPTY_PROFILE: CandidateProfile = createEmptyProfile(new Date(minutesAgo(0)))
