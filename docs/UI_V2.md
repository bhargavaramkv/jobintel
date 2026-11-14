# UI V2

Rollback point: git tag `ui-v1-final` (= `a44d84d`). Task list: [`TODO.md`](../TODO.md).

A dark UI that works on real data. Nothing in it is automatic: the user searches, tracks and sets statuses by hand.

## Screens and routes

Hash routes, defined in `src/app/router.tsx` and `src/app/navigation.ts`.

| Screen | Route | Folder |
|---|---|---|
| Dashboard | `#/` | `src/features/dashboard` |
| Setup | `#/onboarding` (`?step=resume`, `candidate`, `roles`, `skills`, `location` or `salary`) | `src/features/onboarding` |
| Resumes | `#/resumes` | `src/features/resumes` |
| Jobs | `#/jobs/:jobId?` (`?q=&city=&mode=&min=&sort=`) | `src/features/discovery` |
| Applications | `#/applications` | `src/features/applications` |
| Settings | `#/settings` | `src/features/settings` |

Unknown routes (including the removed `#/activity`) redirect to the Dashboard. `public/404.html` turns a path URL
such as `/jobintel/jobs` into `/jobintel/#/jobs` on GitHub Pages.

## Data sources

1. **Job feed**: `public/data/jobs.json`, written by the collector. `src/app/feed.ts` fetches it and validates it with
   `src/domain/jobs/feedSchema.ts`. `FeedProvider` loads it once and exposes loading, ready and error states (with
   Retry). Only open jobs are shown.
2. **Candidate profile**: saved in this browser's localStorage. Edited through `src/domain/profile`
   (`draftFromProfile`, `profileFromDraft`, `calculateReadiness`). Jobs are scored with `matchJob`.
3. **Master resume**: the `.tex` the user uploads, checked with `validateTexUpload`, saved in localStorage and shown
   with line numbers. Roles and skills are suggested from it by `src/domain/resume/infer.ts`.

## Saved state

`src/app/storage-local.ts` wraps localStorage. Every read and write is in try/catch, so the app still renders when
storage is blocked or full (a banner says changes will not be kept). Everything lives under one key, `jobintel:v2`:

| Part | Content |
|---|---|
| `profile` | A candidate profile, or null on a first visit |
| `resume` | Name, size, upload time and the `.tex` source, or null |
| `tracked` | Tracked jobs: id, title, company, url, date tracked, status, notes |
| `prefs` | `{ minScore }` |

`src/app/appState.ts` validates each part separately on load, so one bad part never drops the rest.
`AppProvider` holds the state, saves it after every change and also holds the toasts. IndexedDB is not used by this UI.

## Jobs: search, filters and matching

- `src/features/discovery/search.ts` is a pure module: it reads the URL query and applies search (all words must
  appear in title, company or description), city, work mode, minimum score and sort.
- Sort: best match (score, then newest) or newest.
- Minimum score: the `min` query value, else the saved preference. While no job can be scored (no profile data yet)
  it is treated as 0 so the list is not empty.
- The detail panel shows the factor breakdown from `matchJob`, matched and missing skills, the description, and the
  posting link (`target="_blank"`, `rel="noopener noreferrer"`, `http(s)` only). **Track** adds the job to
  Applications with status Saved.

## Applications

Each tracked job has a status the user sets by hand: Saved, Applied, Interview, Offer, Rejected. Status, notes and
removal are saved immediately. Nothing is submitted, verified or contacted on the user's behalf.

## Settings

One form, one Save button: match preferences (minimum score, preferred cities, work modes) and the profile fields
from Setup. Preferred locations and work modes are profile fields, so they feed every match score.
`src/features/profile/ProfileFields.tsx` holds the field groups shared with Setup.

## Design tokens

Dark-first, defined on `:root` in `src/styles/`. Near-black blue surfaces, a cyan accent for focus and active
navigation, amber for warnings, red for danger and green for success. Reduced motion sets durations to 0.

Accessibility basics: one `h1` per page, status shown as text (never colour alone), visible focus rings, a skip link.

## Tests

- Vitest and Testing Library beside the code. `src/test/appFixture.tsx` renders a screen with the providers and a
  synthetic feed.
- Playwright (`e2e/`): every route by direct hash URL and by a path URL through `public/404.html`, no horizontal
  scroll at 375px, axe serious and critical violations at zero, no requests leaving the origin, and flows for search,
  tracking, resume upload, Setup and Settings.
