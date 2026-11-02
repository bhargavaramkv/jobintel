# Implementation status

## Phase 1: app shell, dark UX, local profile ✅

- [x] React + TypeScript + Vite static build, `base: /jobintel/`
- [x] GitHub Actions: typecheck, lint, unit/component tests, build, dist scan, E2E, Pages deploy
- [x] Dark-only blue/cyan design tokens (no purple), reduced-motion support
- [x] Responsive shell: icon rail (desktop/tablet), bottom nav (mobile), `Ctrl/⌘+K` palette
- [x] Dashboard with truthful zero/empty states, setup checklist, readiness, roadmap
- [x] Profile & Preferences: 5 editable sections + Data & privacy
- [x] IndexedDB repository with schema version + migrations, Zod validation
- [x] Deterministic readiness score with visible breakdown
- [x] Encrypted backup export/import (AES-GCM + PBKDF2) with tests
- [x] Clear local data with typed confirmation
- [x] Unsaved-changes guard (in-app navigation and tab close)
- [x] README, architecture doc

### Known limitations

- Data lives in one browser profile only. There is no cross-device sync, by design.
- Private/incognito windows may discard IndexedDB when closed.
- Planned navigation items are hidden on mobile. The dashboard roadmap lists them instead.
- The backup contains the last *saved* profile, not unsaved edits. The export dialog warns about this.

## Phase 2: job discovery (not started)
## Phase 3: matching engine (not started)
## Phase 4: referral intelligence (not started)
## Phase 5: outreach strategist (not started)
## Phase 6: application management (not started)
## Phase 7: scheduled automation (not started)
## Phase 8: analytics (not started)
## Phase 9: reliability & polish (not started)
