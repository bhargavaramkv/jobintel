import type { PrototypeSettings } from '../types'

export const DEFAULT_SETTINGS: PrototypeSettings = {
  automation: {
    mode: 'auto',
    minMatchScore: 70,
    autoApplyEnabled: true,
    autoApplyMinScore: 85,
    requireNoScreeningQuestions: true,
    alwaysAskFor: ['salary', 'cover-letter', 'relocation', 'custom-questions'],
  },
  limits: { daily: 10, weekly: 40, perCompany: 2 },
  permissions: {
    tailorResumes: true,
    submitApplications: true,
    answerScreening: false,
    createPortalAccounts: false,
  },
  notifications: { needsApproval: true, blocked: true, failures: true, dailySummary: false },
}
