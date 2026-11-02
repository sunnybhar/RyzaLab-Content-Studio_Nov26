# Resume the authorized solo-founder build

Current working branch: `studio-rebuild`. Read the latest `docs/WORK-IN-PROGRESS.md` tail and Git status/log first. October 30 continuation builds explicit first-founder setup and policy adoption after saved checkpoint2037af5. The latest Git commit is authoritative; older checkpoint numbers in historical notes are not the current state.

## Operating requirements

- Read AGENTS.md and relevant installed Next.js docs before implementation.
- User wants one feature at a time, an estimated time before starting, a verified status update when it is done, then the next feature.
- Commit and push at least every five minutes while changes exist, before long checks and before ending. Use `studio-rebuild` for WIP; never push an unfinished release to main. Author email sunnybhargava1611@gmail.com.
- Main most recently shipped0.3.2/4e19ec8; verify Git remote for current state. User authorizes completed verified releases.0.3.3 composer/recovery/newsletter source changes are being verified; never deploy a partial checkpoint.
- Do not claim background work after a turn ends. If paused, stop; resume only when requested.
- No paid provider calls, live database/environment changes, emails, social publishing or schema migrations during this implementation.

## Confirmed product decisions

- Two human decisions: copy approval, then exact final package approval/handoff. Manual human publishing.
- Claude, OpenAI and Gemini account-model selection; actual model IDs come from provider account discovery. Media integrations and social metrics remain pending qualification.
- Routine preparation within founder-authorized total package cap; ask only for exceptions. Suggested starting caps:50c/package and$5/month. No live caps have been changed by this build.
- Agents must report true provenance, supplied-reference scope and incomplete results. Same-provider second pass is not independent; Notes retain separate founder release authority and required independent report.

## Implemented on working branch

- Exact-copy acceptance, immutable final snapshots, stable package budget across revisions, canonical draft/review contracts and safe candidate settlement.
- Compact Ideas tile/list/detail and idempotent linked draft opening; inline Write/Revise with status, retained candidate comparison and protection for unsaved edits.
- Two-step review UI and automatic textual-review orchestration after copy approval, with atomic preparation and maintenance recovery. No auto retry of failed/unknown/incomplete work. Live worker still performs provider dispatch.
- Provider/function setup cards, credential-preserving connection editor, real account model discovery with fixed official URLs/pagination; no invented current catalogue.
- Versioned qualified-rate registry UI/API, source/date/evidence, inherited environment rates retained at first adoption, snapshot comparison at dispatch.
- Recent-ten activity plus active/unknown jobs and older searchable popup; horizontal channel tabs/selected states; compact home brand message.
- Calendar ready-to-plan tray and read-only approved snapshots with authenticated asset rendering; existing explicit schedule controls and manual publication confirmation.
- User changed role administration policy: both administrators and founders may manage all people and assign any role, including founder to themselves or others. No server email setting or extra API key is required. People uses role checkboxes plus a direct own-founder confirmation. Keep at least one active administrator-or-founder and audit changes. This supersedes older founder-only/bootstrap guidance; see docs/FOUNDER-SETUP.md.
- Founder policy settings now wired in AI & budgets. Explicit adoption only; current policy/rules/budget captured on edit; active/unknown jobs block policy change on server. Automatic review option is visible. Automatic first writing is now implemented as an explicit founder option for new idea selections; existing drafts and saved opt-outs stay unchanged.

## Latest validation

Latest batch:170 tests and the optimized production build pass. Full browser walkthrough plus isolated founder settings, automatic-writing, and automatic-review-to-exact-calendar-planner fixtures pass. Real local PostgreSQL verifies composed operations commit once and stale repeats reject. Tests use mocks/local fixtures, not live credentials or paid provider calls.

## Remaining work

1. People0.3.2 implements the user’s explicitly revised policy: both administrator and founder may grant all roles including founder. No extra founder environment/key is required by current People flow. See docs/FOUNDER-SETUP.md. Do not change live memberships yourself.
2. Automatic first writing is implemented and verified; see docs/AUTOMATIC-WRITING.md. Preserve actor/context-pinned intent, existing-draft opt-outs, total budget enforcement and no automatic paid retries.
3. Immediate final-approval planner is implemented for the two-step flow, using the exact returned package and separate scheduling authority. Domain checks cover equivalent-instant duplicates and permission separation. Its final browser/build verification passes; see latest WORK-IN-PROGRESS. Shared persist now normalizes multiple internal transitions to one database version increment; the real local PostgreSQL regression passes.
4. Improve default per-function routing controls if needed, keeping explicit overrides and disconnected bindings fail closed. Do not silently change live workflows or guess provider capabilities.
5. Refresh training/QA/backlog artifacts honestly; manual QA remains Not run until a human actually tests. Existing14 modules/160manualcases/54 backlog rows are older release documentation.
6. Final integrated browser, permission/budget/worker integrity review, production build, then only a complete verified release to main. Exact requested review-model routing may be unavailable; do not claim a specific reviewer clearance without evidence.

## Useful files and commands

- `lib/studio/review-orchestration.ts`, `generation.ts`, `draft-candidates.ts`, `solo-quality.ts`, `preparation-budget.ts`, `dispatch-permissions.ts`.
- `lib/studio/founder-setup.ts`, `components/founder-setup.tsx`, `solo-policy-settings.tsx`, founder API route.
- `npm test`; `npm run typecheck`; `npm run build`; full browser `TEST_BASE_URL=http://127.0.0.1:PORT npm run test:browser`.
- Isolated `npx tsx tests/founder-settings-browser.mts` bundles components with local fixtures. Automatic-review browser fixture expects a running production app. No fixture represents live success.
- `/studio` is live; `/preview` is demo. User previously opened preview and feared data loss; never reset storage or imply preview data are production.
- Supabase state/secret persistence uses atomic CAS. Private asset preview requires authenticated fetching. Preserve historical evidence, frozen references, leases and unknown-outcome reservations.

## October30 Create follow-up

Read docs/RELEASE-0.3.3.md and latest WIP. Recovery normalizes flat metadata and prepares saved response without AI. Write controls are inside editor; direct first writing carries unresolved [Confirm:] metadata. Preview shows current unsaved text/media, not notes/raw JSON. Ideas and LinkedIn/Reddit can create linked Newsletter drafts for manual or AI writing without auto spending. User priority acceptance queue: docs/CONTENT-ACCEPTANCE-QUEUE.md, LinkedIn first then Newsletter,3AI+2manual cases, no paid test run started.

## 0.3.4 reviewer follow-up

See docs/RELEASE-0.3.4.md. Shared confirmation markers highlight editor text; Needs your input jumps to fields, including hidden notes. Server submit rejects unfinished markers. Reviews allow Edit content→Save and submit in the same popup with revision/history/permissions and atomic resubmission. Notes are collapsed; two human approvals remain, with optional evidence notes and explicit copy-check attestation.188 domain tests/build/full browser/focused input/review-to-calendar fixtures passed. Web research for ideas AND posts is explicitly queued only in CONTENT-ACCEPTANCE-QUEUE; no paid calls/activation.

##0.3.5 research continuation

Research connected to Ideas and Write through explicit public queries, retained citations and selected evidence IDs. Domain/API canonical prompts, budget authorization, frozen source snapshots and dispatch/settlement/application permission checks are implemented. Price editor supports bounded Claude research qualification; validated connections can become Research default.198 tests/build/full browser/research selection/automatic writing/pricing UI pass. Five local synthetic samples pass; live paid acceptance remains Not run. Read WEB-RESEARCH-SETUP.md and ACCEPTANCE-SAMPLES-0.3.5.md; current docs network blocked, so do not invent live model support/prices. No live state or provider call executed.

## Nov2 research budget fix /0.3.6

User authorized automatic capability/reservation fix, then chose founder-controlled monthly and$0.50–$2/post planning categories. Implemented Models API research inspection, guarded full-context/output-token envelope, dedicated Research setup UI/API without manual price/checkbox, source-dated Sonnet5.5 preset, legacy snapshot rejection and fresh dispatch checks. Package categories/custom160c and aggregate200c server/worker enforcement implemented; unset monthly blank. IMPORTANT: native basic search has no small retrieved-input ceiling.1M-context256-output envelope is$514.02 (not expected charge); it cannot fit$2, so live research remains blocked. Do not weaken this to an expected estimate or raise caps silently. Bounded/fixed-cost retrieval or provider billing controls are the next architecture requirement. See RELEASE-0.3.6.md/WEB-RESEARCH-SETUP.md. Tests use intercepted providers; no live paid sample/config/budget change performed.

## Latest: completed five-build series — v0.3.11

This supersedes older native-search blocking/setup guidance. Bounded public reference retrieval (Wikipedia intros/Crossref abstracts) and tool-free Claude flow are implemented. Separate verified release branches 0.3.7–0.3.11 preserve each change. Latest tree has the full 3 AI + 2 blank manual exercise pack, first-case continuation, owner-scoped execution of already-authorized writing/review jobs while Studio is open, two real human approvals, existing calendar/manual publishing handoff, and usage-priced/held budget visibility. 221 tests/build/browser checks pass locally. Read WORK-IN-PROGRESS.md and LINKEDIN-NEWSLETTER-VERIFY.md. Live hosted rollout/API access, actual paid samples, actual manual writing and human approvals remain unverified/unperformed by this agent. Do not silently replay a failed/uncertain provider job. Monthly budgets remain founder-controlled and per-post total stays capped at $2.
