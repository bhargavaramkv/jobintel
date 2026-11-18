# Product requirements

All requirements below are **planned**. Phase 0 delivers only the foundation (see [implementation-roadmap.md](implementation-roadmap.md)).

## Functional requirements

1. **Discovery**: find jobs from configurable sources, deduplicate them, and store them locally with their source and retrieval time.
2. **Evaluation**: score each job against the candidate profile with an explainable result (matched and missing requirements); the user can override.
3. **Resume intelligence**: produce a tailored resume per job from the master LaTeX resume, emphasising relevant real experience and compiling to PDF.
4. **Application automation**: fill and submit applications through browser automation within the user's policy.
5. **Research**: gather company and role context for evaluation, interviews and outreach.
6. **Tracking**: record every job and application status, follow-up dates and history; surface what needs attention.

## Autonomous workflow

The agent runs discover, evaluate, tailor, apply, track as a loop over a persistent local task queue. It runs unattended within the autonomy policy, resumes after restarts, and stops and asks the user when it hits something it must not decide alone (see [autonomy-policy.md](autonomy-policy.md)).

## Command interface

The command workspace is the primary interface. Commands are short, produce readable output, and show state (what ran, what is waiting, what failed). Every long-running action reports progress and can be inspected afterwards. Phase 0 supports only `help` and `status`.

## Candidate profile and resume

- A single master LaTeX resume is the source of truth, with a structured candidate profile alongside it.
- The system must never fabricate candidate information: no invented employers, titles, dates, skills, degrees or metrics. Tailoring may select, reorder and rephrase true content only.
- Missing profile data is requested from the user, not guessed.

## Application automation

- Uses Playwright as the primary browser driver.
- Captures what was submitted (answers, resume version, timestamp) for each application.
- Stops on CAPTCHA, MFA or unexpected questions it cannot answer from the profile, and asks the user.
- Respects per-site and global limits set by the user.
- Records each action as an audit event.
