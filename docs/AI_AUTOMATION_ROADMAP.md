# AI automation: roadmap

Companion to [`AI_AUTOMATION_ARCHITECTURE.md`](AI_AUTOMATION_ARCHITECTURE.md). Statuses are mirrored in `TODO.md`.

**Goal:** a proactive job-search assistant that helps secure relevant interviews, not another place to enter data.
Every phase is judged by one question: *does it raise the chance of an interview for a job worth wanting?*

## Principles that hold for every phase

1. **Propose, never act.** AI output is a validated recommendation. A person accepts each one.
2. **Local-first.** Candidate data stays in the browser unless the user previews and consents to a specific export.
3. **One inbox.** New capabilities add recommendation *kinds* and *actions* under a new schema version; the review
   experience, lifecycle, backup and privacy tests stay the same.
4. **No paid services without approval.** Anything needing the Claude API (separate billing) stops for a decision.
5. **Separate the local workflow from automated integrations.** A phase that removes the manual hand-off must say what
   credentials it uses and where candidate data would then live.
6. **Never send or submit automatically.** No phase changes this.

## Status

| Phase | Capability | Status |
|---|---|---|
| **A1** | AI foundation: context export with consent, schema v1, inbox, briefing, apply via existing repositories | ✅ Implemented |
| A2 | Scheduled runs with no typing | ✅ Folded into A3 |
| A3 | Automated loop with a private repo and a daily cloud routine | ✅ Implemented |
| A4 | Company and ATS-board discovery, verified and merged automatically | ✅ Implemented |
| A5 | Referral research (lead proposals with public sources) | ✅ Implemented |
| A6 | Stored resume and job-specific resume suggestions | ✅ Implemented |
| A7 | Application status from email | ✅ Implemented; needs a Gmail connector |
| A8 | Interview prep plans | ✅ Implemented |

## A1 — Foundation ✅

What shipped is described in the architecture document. What the user does today: *Assistant → Export & import →
choose → preview → consent → give the file to Claude → import the answer → review in the inbox.*

Known limits, all intentional: the hand-off is manual; nothing runs on a schedule; recommendations can only shortlist,
mark Not interested, add a note or set a follow-up; briefing text is not editable.

## A2 — Local scheduled runs

**Idea.** Remove the typing, keep the data local: a scheduled job on the user's own machine writes the context
export to a folder, runs Claude Code headless with their subscription, and leaves the answer file for the app to
import (a File System Access folder pick in Chromium, no server).

**Needs.** The app can already produce the file; what's new is a way to produce it without clicking (a small local
script plus a documented scheduler entry) and a folder import in the UI.

**Gate (must pass before any work).** Read Anthropic's current terms and usage policy on unattended use of a
subscription login for scripted runs. Documentation says `claude setup-token` is intended for "CI pipelines and
scripts", but I could not confirm that terms permit unattended personal-subscription automation. If unclear, A2 stays
manual-but-one-click.

**Cost.** Subscription usage only. Must not have `ANTHROPIC_API_KEY` set.

**Risk.** A token on disk; a stale-run loop burning allowance. Mitigate with one run per day, a size cap from the
preview, and an explicit "run now" fallback.

## A3 — Cloud scheduled tasks for the daily briefing

**Idea.** A scheduled task (formerly "routine") on Anthropic's cloud writes the briefing every morning, so it is ready
when the app opens.

**The catch.** It runs against a GitHub repository, and the useful data lives in the browser. The only way to feed it
is to place a context file in a **private** repository, i.e. candidate data moves to GitHub. Encryption doesn't help
because Claude has to read it.

**Decision needed from you (not assumed).** Is that trade acceptable, and which switches would you allow in an
unattended export (suggested: profile preferences and pipeline only; no names, notes or leads)?

**Needs.** A private companion repo; a content-light export mode; a scheduled task writing a result file to a
`claude/` branch; the app importing from a file you download or a folder. Research-preview feature with usage caps
(docs disagree on hourly vs daily; verify at claude.ai/settings/usage).

## A4 — Company and ATS-board discovery

**Idea.** Find more places that hire the target roles in Bengaluru and Hyderabad, and judge which are worth adding.

**Split the work.** Detecting a company's board (Greenhouse, Lever, Ashby slug probing) is **deterministic** and
belongs in the collector, not in AI. AI contributes *relevance*: "is this a product company with .NET/backend roles
at SDE-2 level?".

**Data.** Public only, so this is the one phase that can safely run as a cloud scheduled task on the public repo.
Output: *proposals* to add sources (a new recommendation kind), reviewed in the inbox, then a PR to `sources.json`.

**Schema.** v2 adds kind `source-proposal` and an `add-source` action that writes a draft, not the live list.

## A5 — Referral research and evidence-based outreach

**Idea.** For shortlisted companies, suggest who might be worth contacting and what shared context exists, with
sources.

**Constraints that carry over from Phase 4/5.** Every lead needs a source URL; relationships are derived from recorded
facts, never asserted; no scraping by the app; nothing is sent. Claude researching on the public web happens in the
user's own session, and the result enters as a *proposed lead* with its evidence, never as a confirmed relationship.

**Schema.** v2 adds `lead-proposal` and an `add-lead` action that creates a lead with status `new`, `knowsPersonally:
false`, `workedTogether: false`.

**Risk.** Third-party personal data (names, employers). Default to company-level suggestions and role titles;
person-level only on request.

## A6 — Resume analysis and tailoring

**New data category.** JobIntel stores only a resume *label* today. This phase needs resume text, which is more
sensitive than anything exported so far.

**Plan.** Resume text is pasted for a single analysis and not stored unless the user chooses; it's a separate
default-off switch with its own preview. Output: suggestions per job (gaps vs the posting, wording to emphasise, truthful
rewrites with the original shown), never a rewritten resume applied automatically.

**Schema.** v2 adds `resume-suggestion` with before/after text and a "claims you must be able to back up" caveat list.

## A7 — Application status from email

**Idea.** Detect "interview scheduled", "rejected", "assessment" from the user's mailbox and propose a stage change.

**How.** claude.ai connectors (Gmail, Calendar) are available in the user's own Claude session; a `setup-token`
session cannot use connectors. So this is a *manual-assisted* flow first: the user asks Claude, in claude.ai with the
Gmail connector, to produce a JobIntel result file for recent job emails, which is imported like any other.

**Schema.** v2 adds action `set-stage` limited to forward moves with quoted evidence (sender domain, date, a short
excerpt), never the full email. A backwards or terminal move (offer, rejected) always needs explicit confirmation.

**Risk.** Email is the most sensitive source. Evidence is excerpted, minimal and never exported by JobIntel itself.

## A8 — Adaptive preparation

**Idea.** Turn interview outcomes and the analytics funnel into targeted preparation: which topics to practise, which
kinds of roles convert.

**Constraints.** Analytics already labels correlations and small samples; AI advice must repeat those caveats.
Output kinds: `prep-plan`, `insight`. No new write actions.

## Cross-cutting backlog

- Editable briefing; "ask a follow-up about this recommendation" export.
- Schema v2 with migration of stored v1 records (parse both, write new).
- Compare AI fit against the deterministic score over time and show disagreement rates in Analytics.
- Optional encrypted export file for the context (useful only once a reader that can decrypt it exists).

## Decisions taken (2026-11-03)

Automate as much as possible with minimal interaction. Unattended runs on the owner's Pro subscription are fine, kept to one run a day. A private repository holds the synced context. Referral research proposes people only with a public source and never asserts a relationship. The resume is stored.

## Questions that were open before A2/A3

1. After reading Anthropic's terms, are you comfortable with unattended scripted use of your Pro login (A2)?
2. Would you accept a **private GitHub repo** holding a minimal context export for a cloud scheduled task (A3)?
3. Should A5 propose people, or only companies and role titles?
4. Should A6 ever store resume text locally, or always paste per use?
