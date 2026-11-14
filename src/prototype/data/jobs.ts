import type { AtsKind, City, JobWorkMode } from '../../domain/jobs/feedSchema'
import { minutesAgo } from '../clock'
import type { MockJob, Verdict } from '../types'

interface Spec {
  key: string
  ats: AtsKind
  company: string
  title: string
  department: string
  cities: City[]
  locations: string[]
  workMode: JobWorkMode
  description: string
  requirements: string[]
  preferred?: string[]
  verdict: Verdict
  reasons: string[]
  screening?: boolean
  seenMinutesAgo: number
}

const build = (s: Spec): MockJob => ({
  id: `${s.ats}:${s.key}`,
  sourceKey: `${s.ats}:${s.key.split(':')[0]}`,
  ats: s.ats,
  sourceId: s.key.split(':')[1] ?? s.key,
  company: s.company,
  title: s.title,
  locations: s.locations,
  cities: s.cities,
  remoteIndia: s.workMode === 'remote',
  workMode: s.workMode,
  department: s.department,
  employmentType: 'Full-time',
  description: s.description,
  requirements: s.requirements,
  ...(s.preferred ? { preferred: s.preferred } : {}),
  url: `https://jobs.example.invalid/${s.key.replace(':', '/')}`,
  postedAt: minutesAgo(s.seenMinutesAgo + 600),
  firstSeenAt: minutesAgo(s.seenMinutesAgo),
  lastVerifiedAt: minutesAgo(30),
  status: 'open',
  agentDecision: { verdict: s.verdict, reasons: s.reasons },
  screeningQuestions: s.screening ?? false,
})

const SPECS: Spec[] = [
  {
    key: 'nimbus:1001', ats: 'greenhouse', company: 'Nimbus Ledger', title: 'Backend Engineer, Payments', department: 'Engineering',
    cities: ['Bengaluru'], locations: ['Bengaluru, India'], workMode: 'hybrid',
    description: 'Own the ledger and settlement services behind Nimbus Ledger. You will design APIs, tune SQL Server workloads and ship weekly with a small team.',
    requirements: ['3+ years building backend services in C# and .NET', 'Strong SQL Server and query tuning experience', 'Experience designing REST APIs', 'Comfortable with Docker in local development'],
    preferred: ['Azure experience is a plus'],
    verdict: 'selected', reasons: ['Core stack matches: C#, .NET and SQL Server', 'Bengaluru hybrid is inside your location and work-mode preferences', 'Four years of experience meets the 3+ asked'],
    seenMinutesAgo: 190,
  },
  {
    key: 'quillpay:2044', ats: 'lever', company: 'Quillpay', title: 'Full-stack Engineer', department: 'Product Engineering',
    cities: ['Hyderabad'], locations: ['Hyderabad, India'], workMode: 'hybrid',
    description: 'Build merchant-facing dashboards in React and the .NET APIs behind them. Small product pods, direct customer feedback.',
    requirements: ['3+ years of full-stack experience', 'React and TypeScript in production', 'C# and .NET for APIs', 'SQL fundamentals'],
    verdict: 'selected', reasons: ['React, TypeScript and .NET all on your primary list', 'Full-stack is one of your target roles', 'Hyderabad hybrid fits your preferences'],
    screening: true, seenMinutesAgo: 420,
  },
  {
    key: 'harbor:318', ats: 'greenhouse', company: 'Harbor Analytics', title: 'SDE-2, Backend', department: 'Platform',
    cities: ['Bengaluru'], locations: ['Bengaluru, India', 'Remote, India'], workMode: 'remote',
    description: 'Work on the event pipeline that feeds Harbor dashboards. Mostly C# services with PostgreSQL and a Kafka backbone.',
    requirements: ['3+ years of backend development', 'C# and .NET', 'PostgreSQL', 'Kafka or a similar streaming system'],
    preferred: ['Redis experience is a plus'],
    verdict: 'selected', reasons: ['SDE-2 matches your target seniority', 'Remote India fits your work modes', 'Kafka is a gap, but the rest of the stack matches'],
    seenMinutesAgo: 610,
  },
  {
    key: 'brightwave:77', ats: 'lever', company: 'Brightwave Labs', title: 'Software Engineer II', department: 'Engineering',
    cities: ['Bengaluru'], locations: ['Bengaluru, India'], workMode: 'hybrid',
    description: 'Join the Brightwave scheduling team. You will extend a .NET service on Azure and pair with designers on a React front end.',
    requirements: ['2+ years of professional software engineering', '.NET and C#', 'SQL', 'React is a plus'],
    preferred: ['Azure'],
    verdict: 'selected', reasons: ['Software Engineer II maps to your SDE-2 target', 'Azure and React both appear in your profile', 'Product company, Bengaluru hybrid'],
    seenMinutesAgo: 800,
  },
  {
    key: 'kestrel:5120', ats: 'greenhouse', company: 'Kestrel Cloud', title: 'Backend Engineer', department: 'Cloud Platform',
    cities: ['Hyderabad'], locations: ['Hyderabad, India'], workMode: 'hybrid',
    description: 'Build control-plane services for a managed container platform. C#, Docker and Kubernetes every day.',
    requirements: ['3+ years of backend experience', 'C# and .NET', 'Docker', 'Kubernetes'],
    verdict: 'selected', reasons: ['Your C#, .NET and Docker experience matches', 'Kubernetes is the one missing skill', 'Hyderabad hybrid fits your preferences'],
    seenMinutesAgo: 95,
  },
  {
    key: 'orchid:902', ats: 'lever', company: 'Orchid Health', title: 'Senior Full-stack Engineer', department: 'Engineering',
    cities: ['Bengaluru'], locations: ['Bengaluru, India'], workMode: 'hybrid',
    description: 'Lead the patient-portal front end and its API layer. Mentoring junior engineers is part of the role.',
    requirements: ['5+ years of full-stack experience', 'React and TypeScript', 'C# and .NET', 'SQL'],
    verdict: 'review', reasons: ['Senior is one level above your SDE-2 target', 'Asks for 5+ years; you have 4', 'Stack and location otherwise match, so a human should decide'],
    seenMinutesAgo: 300,
  },
  {
    key: 'lumen:61', ats: 'greenhouse', company: 'Lumen Retail Tech', title: 'Backend Engineer', department: 'Commerce',
    cities: ['Bengaluru'], locations: ['Bengaluru, India'], workMode: 'hybrid',
    description: 'Build catalogue and pricing services. The newer services are written in Go; older ones are .NET.',
    requirements: ['3+ years of backend experience', 'Go or C#', 'SQL', 'Experience with message queues'],
    verdict: 'review', reasons: ['Go is preferred for new work and is not on your profile', 'Salary range is not stated', 'C# is accepted, so it is borderline'],
    screening: true, seenMinutesAgo: 510,
  },
  {
    key: 'tessera:12', ats: 'lever', company: 'Tessera Robotics', title: 'Software Engineer, Fleet Tools', department: 'Software',
    cities: ['Bengaluru'], locations: ['Bengaluru, India'], workMode: 'onsite',
    description: 'Internal tooling for robot fleet operators: a React front end and a .NET back end. On site at the Whitefield lab.',
    requirements: ['3+ years of software engineering', 'C# and .NET', 'React', 'SQL'],
    verdict: 'review', reasons: ['On-site only; you prefer hybrid or remote', 'Stack and seniority match well'],
    seenMinutesAgo: 700,
  },
  {
    key: 'palisade:408', ats: 'greenhouse', company: 'Palisade Security', title: 'Security Engineer', department: 'Security',
    cities: ['Bengaluru'], locations: ['Bengaluru, India'], workMode: 'hybrid',
    description: 'Run application security reviews and build detection tooling in Python.',
    requirements: ['4+ years in application security', 'Python', 'Threat modelling', 'Cloud security'],
    verdict: 'rejected', reasons: ['Security role; your targets are backend and full-stack', 'Python and threat modelling are not on your profile'],
    seenMinutesAgo: 240,
  },
  {
    key: 'corvid:93', ats: 'lever', company: 'Corvid Games', title: 'Gameplay Programmer', department: 'Studio',
    cities: ['Other India'], locations: ['Mumbai, India'], workMode: 'onsite',
    description: 'Write gameplay systems in C++ for a console title.',
    requirements: ['3+ years of C++', 'Unreal Engine', 'Game physics'],
    verdict: 'rejected', reasons: ['Mumbai is outside Bengaluru and Hyderabad, and you are not relocating', 'On-site only', 'C++ and Unreal are not on your profile'],
    seenMinutesAgo: 900,
  },
  {
    key: 'marlin:2207', ats: 'greenhouse', company: 'Marlin Logistics', title: 'Engineering Manager', department: 'Engineering',
    cities: ['Hyderabad'], locations: ['Hyderabad, India'], workMode: 'hybrid',
    description: 'Manage two teams building route-planning services.',
    requirements: ['8+ years of engineering experience', '2+ years managing engineers', 'Hiring and performance management'],
    verdict: 'rejected', reasons: ['Management role; you target individual-contributor roles', 'Asks for 8+ years; you have 4'],
    seenMinutesAgo: 1000,
  },
  {
    key: 'sable:15', ats: 'lever', company: 'Sable Data', title: 'Data Engineering Intern', department: 'Data',
    cities: ['Bengaluru'], locations: ['Bengaluru, India'], workMode: 'hybrid',
    description: 'Six-month internship on the batch pipeline team.',
    requirements: ['Currently studying computer science', 'Python and SQL basics'],
    verdict: 'rejected', reasons: ['Title contains "Intern", which you excluded', 'Below your target seniority'],
    seenMinutesAgo: 1200,
  },
]

export const MOCK_JOBS: MockJob[] = SPECS.map(build)
