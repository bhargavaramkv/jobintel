import { minutesAgo } from '../clock'
import type { ResumeChange, ResumesData, ResumeVariant } from '../types'

interface Content {
  summary: string
  skills: string
  bullets: string[]
}

const BASE: Content = {
  summary:
    'Backend-leaning full-stack engineer with four years building payment and ledger services in C\\# and .NET, plus React front ends.',
  skills: 'C\\#, .NET, SQL Server, REST APIs, React, TypeScript, Docker, Azure, Redis',
  bullets: [
    'Built a double-entry ledger service handling 1.2M postings a day with idempotent writes.',
    'Cut p95 settlement query time from 900 ms to 140 ms by reworking indexes and batching.',
    'Led the move of three services to Docker-based deploys with blue/green releases.',
    'Shipped a React and TypeScript merchant dashboard used by 4,000 weekly users.',
  ],
}

/** Builds a complete LaTeX resume. Used for the master and every generated variant. */
function texFor(c: Content): string {
  return String.raw`\documentclass[10pt,a4paper]{article}
\usepackage[margin=0.8in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage[colorlinks=false]{hyperref}

\pagestyle{empty}
\setlength{\parindent}{0pt}
\titleformat{\section}{\large\bfseries}{}{0em}{}[\titlerule]
\titlespacing*{\section}{0pt}{10pt}{6pt}
\setlist[itemize]{leftmargin=1.2em, itemsep=2pt, topsep=2pt}

\newcommand{\role}[3]{\textbf{#1} \hfill #3 \\ \textit{#2}}

\begin{document}

\begin{center}
  {\LARGE \textbf{Arjun Rao}} \\[4pt]
  Bengaluru, India \quad arjun.rao@mail.example.invalid \quad +91 00000 00000
\end{center}

\section{Summary}
${c.summary}

\section{Skills}
\textbf{Core:} ${c.skills}

\section{Experience}
\role{Software Engineer II}{Finlane Systems, Bengaluru}{2024 -- Present}
\begin{itemize}
${c.bullets.map((b) => `  \\item ${b}`).join('\n')}
\end{itemize}

\role{Software Engineer}{Finlane Systems, Bengaluru}{2022 -- 2024}
\begin{itemize}
  \item Built reconciliation jobs that matched 98\% of bank files without manual review.
  \item Wrote the first automated integration test suite; coverage rose from 12\% to 71\%.
  \item Mentored two new joiners through their first production releases.
\end{itemize}

\role{Associate Engineer}{Cobalt Infosystems, Chennai}{2020 -- 2022}
\begin{itemize}
  \item Maintained a customer billing portal in ASP.NET MVC with SQL Server.
  \item Automated month-end reports, saving the finance team about six hours a month.
\end{itemize}

\section{Projects}
\textbf{Ledgerlite} -- open source double-entry ledger library for .NET, 300 stars.
\begin{itemize}
  \item Property-based tests guarantee that every posting balances to zero.
  \item Used by two small fintech teams in production.
\end{itemize}

\textbf{Queuewatch} -- a small dashboard that visualises dead-letter queues.
\begin{itemize}
  \item React and TypeScript front end with a minimal ASP.NET Core API.
  \item Packaged as a single Docker image.
\end{itemize}

\section{Education}
\role{B.E. Computer Science}{Coastal Institute of Technology}{2016 -- 2020}

\section{Awards}
\begin{itemize}
  \item Engineering excellence award, Finlane Systems, 2025.
  \item Regional hackathon winner, 2019.
\end{itemize}

\end{document}
`
}

export const MASTER_TEX = texFor(BASE)

interface VariantSpec {
  id: string
  title: string
  jobId: string
  versions: Array<{ age: number; summary: string; content: Content; changes: ResumeChange[] }>
}

const SPECS: VariantSpec[] = [
  {
    id: 'res-nimbus',
    title: 'Nimbus Ledger, Backend Engineer',
    jobId: 'greenhouse:nimbus:1001',
    versions: [
      {
        age: 190,
        summary: 'Leads with ledger and SQL Server work.',
        content: { ...BASE, skills: 'C\\#, .NET, SQL Server, REST APIs, Docker, Azure, React' },
        changes: [
          { section: 'Skills', before: 'C#, .NET, SQL Server, REST APIs, React, TypeScript, Docker, Azure, Redis', after: 'C#, .NET, SQL Server, REST APIs, Docker, Azure, React', reason: 'The posting names SQL Server, REST and Docker first.' },
        ],
      },
      {
        age: 120,
        summary: 'Adds settlement metrics to the first bullet.',
        content: { ...BASE, skills: 'C\\#, .NET, SQL Server, REST APIs, Docker, Azure, React', bullets: ['Built a double-entry ledger and settlement service handling 1.2M postings a day with idempotent writes.', ...BASE.bullets.slice(1)] },
        changes: [
          { section: 'Experience, bullet 1', before: 'Built a double-entry ledger service handling 1.2M postings a day with idempotent writes.', after: 'Built a double-entry ledger and settlement service handling 1.2M postings a day with idempotent writes.', reason: 'The role is about settlement; the master bullet only said ledger.' },
        ],
      },
    ],
  },
  {
    id: 'res-quillpay',
    title: 'Quillpay, Full-stack Engineer',
    jobId: 'lever:quillpay:2044',
    versions: [
      {
        age: 400,
        summary: 'Moves the React dashboard bullet to the top.',
        content: { ...BASE, summary: 'Full-stack engineer with four years across C\\# and .NET APIs and React and TypeScript front ends.', bullets: [BASE.bullets[3], BASE.bullets[0], BASE.bullets[1], BASE.bullets[2]] },
        changes: [
          { section: 'Summary', before: 'Backend-leaning full-stack engineer with four years building payment and ledger services', after: 'Full-stack engineer with four years across C# and .NET APIs and React and TypeScript front ends', reason: 'The role is full-stack, not backend-leaning.' },
          { section: 'Experience, order', before: 'Dashboard bullet last', after: 'Dashboard bullet first', reason: 'React is the first requirement.' },
        ],
      },
    ],
  },
  {
    id: 'res-harbor',
    title: 'Harbor Analytics, SDE-2 Backend',
    jobId: 'greenhouse:harbor:318',
    versions: [
      {
        age: 590,
        summary: 'Emphasises event-driven work and Redis.',
        content: { ...BASE, skills: 'C\\#, .NET, SQL, PostgreSQL, Redis, Docker', bullets: ['Built idempotent, event-driven posting pipelines handling 1.2M events a day.', ...BASE.bullets.slice(1, 3)] },
        changes: [
          { section: 'Skills', before: 'SQL Server, REST APIs, React, TypeScript', after: 'SQL, PostgreSQL, Redis', reason: 'The posting wants PostgreSQL and lists Redis as a plus.' },
          { section: 'Experience, bullet 1', before: 'Built a double-entry ledger service handling 1.2M postings a day with idempotent writes.', after: 'Built idempotent, event-driven posting pipelines handling 1.2M events a day.', reason: 'Matches the event pipeline the team owns. Kafka is not claimed.' },
        ],
      },
      {
        age: 560,
        summary: 'Drops the front-end bullet to keep one page.',
        content: { ...BASE, skills: 'C\\#, .NET, SQL, PostgreSQL, Redis, Docker', bullets: BASE.bullets.slice(0, 3) },
        changes: [{ section: 'Experience', before: 'Four bullets', after: 'Three bullets', reason: 'The React bullet is not relevant to a backend role.' }],
      },
    ],
  },
  {
    id: 'res-brightwave',
    title: 'Brightwave Labs, Software Engineer II',
    jobId: 'lever:brightwave:77',
    versions: [
      {
        age: 770,
        summary: 'Highlights Azure deploys and React.',
        content: { ...BASE, skills: 'C\\#, .NET, SQL Server, Azure, React, Docker' },
        changes: [{ section: 'Skills', before: 'C#, .NET, SQL Server, REST APIs, React, TypeScript, Docker, Azure, Redis', after: 'C#, .NET, SQL Server, Azure, React, Docker', reason: 'Azure is preferred and React is a plus in the posting.' }],
      },
    ],
  },
  {
    id: 'res-kestrel',
    title: 'Kestrel Cloud, Backend Engineer',
    jobId: 'greenhouse:kestrel:5120',
    versions: [
      {
        age: 85,
        summary: 'Leads with the Docker migration.',
        content: { ...BASE, skills: 'C\\#, .NET, Docker, SQL Server, Azure', bullets: [BASE.bullets[2], BASE.bullets[0], BASE.bullets[1]] },
        changes: [
          { section: 'Experience, order', before: 'Ledger bullet first', after: 'Docker deploy bullet first', reason: 'The platform team runs containers. Kubernetes is not claimed.' },
        ],
      },
    ],
  },
  {
    id: 'res-orchid',
    title: 'Orchid Health, Senior Full-stack Engineer',
    jobId: 'lever:orchid:902',
    versions: [
      {
        age: 280,
        summary: 'Adds mentoring and ownership, held for review.',
        content: { ...BASE, summary: 'Full-stack engineer with four years owning services and a React front end end-to-end, and mentoring newer engineers.' },
        changes: [{ section: 'Summary', before: 'Backend-leaning full-stack engineer', after: 'Full-stack engineer ... owning services and a React front end end-to-end, and mentoring newer engineers', reason: 'The role asks for ownership and mentoring. The experience gap (4 vs 5 years) is not hidden.' }],
      },
    ],
  },
]

const variants: ResumeVariant[] = SPECS.map((s) => ({
  id: s.id,
  title: s.title,
  jobId: s.jobId,
  versions: s.versions.map((v, i) => ({
    version: i + 1,
    createdAt: minutesAgo(v.age),
    summary: v.summary,
    source: texFor(v.content),
    changes: v.changes,
  })),
}))

export const MOCK_RESUMES: ResumesData = {
  master: { name: 'arjun-rao-master.tex', size: MASTER_TEX.length, uploadedAt: minutesAgo(60 * 24 * 12), tex: MASTER_TEX },
  variants,
}

export const EMPTY_RESUMES: ResumesData = { master: null, variants: [] }
