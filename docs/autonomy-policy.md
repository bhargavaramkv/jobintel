# Autonomy policy

This policy governs the agent once it exists (Phase 1+). Phase 0 contains no autonomous behaviour.

## Permitted autonomous actions (defaults)

Without asking, the agent may: discover and read public job postings, evaluate and score jobs, generate tailored resume drafts from the master resume, research companies from public sources, and update local tracking records.

Submitting applications and sending outreach are permitted only when the user's policy enables them (below).

## User-configurable restrictions

The user can set: which actions are autonomous versus approval-required, maximum applications and messages per day and per site, allowed and blocked companies, sources and sites, and a global pause. The strictest applicable setting wins. Absent configuration, submission and outreach require approval.

## Data integrity

- Never fabricate or infer candidate information; ask the user instead.
- Tailored documents are derived only from the master resume and profile.
- Records of what was submitted are kept as sent and are not rewritten afterwards.

## External action auditing

Every external action (network request that acts on a third-party site, application submission, message sent, file uploaded) writes an `AuditEvent` with actor, action, target, outcome and JSON detail. Actions are recorded whether they succeed or fail. The audit log is append-only from the application's point of view.

## CAPTCHA and MFA

The agent does not solve, bypass or work around CAPTCHA, MFA, or other human-verification steps. It stops that task, records an audit event, and asks the user to complete the step.

## Submission and outreach

Applications and any outreach (email, messages) must respect the user's policy: limits, approval requirements and blocklists. When in doubt the agent asks rather than acts.
