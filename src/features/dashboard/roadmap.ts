export const ROADMAP = [
  { phase: 1, label: 'App shell & local profile', done: true, blurb: '' },
  { phase: 2, label: 'Job discovery', done: true, blurb: '' },
  { phase: 3, label: 'Matching engine', done: true, blurb: '' },
  {
    phase: 4,
    label: 'Referral intelligence',
    done: true,
    blurb: 'Record referral leads for shortlisted companies, each with a source and a confidence label.',
  },
  {
    phase: 5,
    label: 'Outreach strategist',
    done: true,
    blurb: 'Draft respectful referral and recruiter messages from known context only, with follow-up timing.',
  },
  {
    phase: 6,
    label: 'Application tracking',
    done: true,
    blurb: 'Track every application through interviews and offers, with status history and follow-ups.',
  },
  { phase: 7, label: 'Scheduled scans & reminders', done: true, blurb: 'Reminders for due follow-ups while the app is open.' },
  { phase: 8, label: 'Analytics', done: false, blurb: 'Funnel, response rates and skill gaps from your own records.' },
  { phase: 9, label: 'Reliability & polish', done: false, blurb: 'Security, accessibility and recovery review.' },
] as const

export const NEXT_MILESTONE = ROADMAP.find((r) => !r.done)
