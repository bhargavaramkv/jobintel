# Security & privacy review (Phase 9)

Reviewed against `IMPLEMENTATION_PLAN.md` §2 on 2026-11-02.

| Area | Status | How it's enforced |
|---|---|---|
| Personal data stays in the browser | ✅ | Profile, decisions, applications, referral leads and outreach live only in IndexedDB. The app's only network request is a same-origin GET for `data/jobs.json`. E2E tests fail on any request leaving the origin. |
| Public feed has no candidate data | ✅ | The collector never reads profile data. `check:dist` fails if any private field name (profile, leads, applications, outreach) appears under `data/`. |
| No secrets in the bundle | ✅ | No `VITE_*` secrets, no API keys. `check:dist` scans for GitHub/AWS/API key patterns and private keys. |
| No trackers / third-party requests | ✅ | System fonts, no CDNs. `check:dist` rejects known analytics hosts. |
| Content-Security-Policy | ✅ | Build adds a CSP `<meta>` (`default-src 'self'`, `script-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `form-action 'none'`, `base-uri 'self'`). `check:dist` fails without it; E2E fails on CSP violations. Inline *styles* are allowed for bar widths only. |
| Outbound links | ✅ | All external links use `target="_blank" rel="noopener noreferrer"`; the page sets `referrer=no-referrer`. |
| Untrusted posting text | ✅ | Rendered as text by React (no `dangerouslySetInnerHTML`). The collector converts HTML to plain text. |
| User-entered URLs | ✅ | Lead/profile links must be `http(s)` (Zod), so `javascript:` URLs can't be stored. |
| Backups | ✅ | AES-256-GCM, PBKDF2-SHA-256 600k iterations, random salt/IV, bounded iterations on import, version checks, Zod validation before anything is replaced. Round-trip covered by unit and E2E tests (including leads and outreach). |
| Automatic external actions | ✅ | Nothing is ever sent or submitted. Outreach is copy-only; "I sent it" just logs. |
| Relationship claims | ✅ | Relationships are derived from recorded facts; there is no field to assert one. |
| GitHub Actions permissions | ✅ | Workflows default to `contents: read`; the scan job alone gets `contents: write`, the alert job `issues: write`, deploy `pages`/`id-token`. Only `GITHUB_TOKEN` is used. |
| Dependencies | ✅ | `npm audit`: 0 vulnerabilities (2026-11-02). Lockfile committed; CI uses `npm ci`. |
| AI context export | ✅ | Built by allowlist, previewed byte for byte, consent required for every export and reset on any change. Sensitive items default off; message text, lead links and files are never exported. Exports are logged as counts only. See `AI_AUTOMATION_ARCHITECTURE.md` §4. |
| AI output is untrusted | ✅ | Strict Zod schema, per-item validation, action whitelist with no send/submit/delete, evidence required, nothing applied on import, and a re-check against the live record on accept. Rendered as text. |
| No AI service or key in the bundle | ✅ | `check:dist` rejects AI API hosts and key patterns; the CSP blocks cross-origin requests; E2E fails on any request leaving the origin during the AI flow. |
| Accessibility | ✅ | axe-core (WCAG 2 A/AA) runs on every screen at desktop, tablet and mobile widths in E2E; serious/critical violations fail CI. |

## Residual risks

- The site is public. Anyone with the URL can load the app (but not your data, which is only in your browser).
- Anyone with access to your unlocked browser profile can read IndexedDB. Use an OS account password, and
  clear data on shared machines.
- The list of tracked companies in `collector/sources.json` is public.
- Once you hand an AI context file to Claude, it is outside JobIntel's control and processed under your Claude
  account's settings. Review what is shared in the preview, and prefer leaving the sensitive switches off.
- Unattended automation with a personal subscription login (planned A2/A3) is not enabled: Anthropic's terms for it
  have not been verified.
- localStorage holds only UI conveniences: the last profile section, whether reminders are on, and the date
  of the last reminder.
