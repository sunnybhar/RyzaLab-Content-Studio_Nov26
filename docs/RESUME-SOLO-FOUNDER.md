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

## Latest UI fix: v0.3.12
User-reported setup checkbox reset was local component state, not proof saved mappings were lost. BoundedWorkflowSetup now derives checked state and selected Text connection from saved active effective bindings/defaults, warns about unsaved intent, and avoids another model call on navigation/reload. AI & budgets uses ten spaced, default-closed lazy BudgetSection accordions. Open the relevant heading before using setup, sample pack, connections or activity. Keep sample pack open during preparation. Build/typecheck, 222 tests and full/focused browser checks pass; no live paid call was made for this fix.

## Latest: v0.3.13 — integrated idea research and unlinked Agent Rules

Generate with agent now retrieves bounded public references automatically and shows ideas/websites/excerpts in the same native window. Add manually offers research/AI development, explicit proposal adoption and saved evidence handoff into writing. Manual assistance stays a proposal rather than automatically creating another idea. Current source coverage is Wikipedia extracts/Crossref abstracts; no unrestricted news search claim. Model/budget/scope checks and idempotent job replay remain enforced.

Agent Rules in Manage stores Instructions/Context originals per channel and a RyzaLab original-content voice library (pasted text or file examples, type-labelled, brand-wide/channel-specific). It is independent storage: NOT parsed, executed, added to active references or connected to any current agent. User explicitly plans to link later. Uploaded Sunny strategy DOCX informed structure only; do not auto-install personal content as RyzaLab guidance. See AGENT-RULES.md and WEB-RESEARCH-SETUP.md. 231 tests/build/full and focused browser checks pass locally; real paid/source acceptance is not asserted. Saved LinkedIn/Newsletter checkbox being disabled/ticked remains QUEUED ONLY; user explicitly said not to work on it.

## Latest continuation: v0.3.14
Verified readable incomplete draft recovery (including old saved JSON) into unchanged empty editors with mandatory unfinished marker; visible idea stages/check status and audience-aware lexical source filtering. Build, typecheck, domain and browser checks passed (see WORK-IN-PROGRESS tail). No live provider calls. Agent Rules remain unlinked. Saved model checkbox issue remains queued. Check main and deployed version before reporting rollout completion.

## Latest continuation: v0.3.15
User authorized linking Agent Rules and voice context, separate LinkedIn Instructions/Markdown uploads, editable persisted setup checkbox and web/news discovery. Implemented and verified (WORK-IN-PROGRESS latest tail). No longer treat Agent Rules as stored-only. New jobs include scoped frozen extracted text; older jobs retain old snapshots. Existing uploads hydrate before new ideas/writing/use-idea requests. General web/news provides linked search excerpts through fixed search feeds; no full-page fetch or comprehensive coverage claim. Five live samples are still blocked by unavailable credentials/network, not completed. No paid calls made. Check hosted version before reporting deployment live.

## Latest continuation: v0.3.16
User-managed channel ZIP upload/preview/edit/atomic save/download plus separate skill guidance Markdown/ZIP and knowledge Markdown uploads. Both user example ZIPs validated, never auto-installed. Scripts/nested archives are skipped. Large context locally selects labelled excerpts while originals remain editable. Long-form Newsletter/Hub or article/newsletter format targets1200–1600words, readable Sources, AI image brief, uploaded hero image, PDF/DOCX exports in Write and visible writing status. Generated short/unsourced newsletters retain confirmation blockers. Qualified text output now4096 after explicit model setup refresh, max18c conservative per-call envelope; no automatic rate changes or paid image generation. Build/typecheck245tests/full+focusedbrowsers passed. Hosted rollout and live five samples still unverified. See NEWSLETTER-WORKFLOW.md.

## Latest continuation: v0.3.17
Fixed screenshot package persistence failure: Mac resource-fork metadata was imported as Markdown, embedding NUL characters rejected by PostgreSQL jsonb22P05. Importer now excludes metadata, validates UTF-8/control characters and accepts original START-HERE filename. Old dirty previews fail with actionable messages, page subtitle now correctly says rules connected. Real database two-channel commit round-trip plus248 tests/build/typecheck/full+focusedbrowsers passed. No live DB migration or paid calls. User must reload afterv317 and re-upload ZIP to rebuild preview, preserving any manual edits first; no need to rename instructions or manually cleanMacZIPs.

## Latest continuation: v0.3.18
Exact original channel/skill ZIP retention and downloads added at user's request. Pre-save selected-original download and post-save filename/size/time download cards are separate from edited-package ZIP. Earlier uploads must be re-uploaded once; originals were not previously retained. Latest per kind/channel,2MBtotal storage limit, workflow-edit channel permissions, never model/search context. Backend revalidates archives, saves original plus derived text atomically, and protects other state on failure. Includesv317Macmetadata save fix already pushed separately. Build/typecheck249tests/full+focusedbrowsers and actual byte-equality download/real PostgreSQL round-trip passed. No paid calls/live DB migrations. Hosted rollout not verified.

## Latest continuation: v0.3.19
Screenshot's exact error was qualified input limit exceeded despite shorttopic; actual error hidden beneath collapsed form. Bounded local compiler reduces optional legacy refs/examples/knowledge/voice with labelled excerpt/omission coverage, keeps protected rules/workflowinstructions/guardrails/checks/outputformat/uploadedInstructions/task complete, freezes exact quote system in new Job.systemSnapshot. Raw saved docs and full ref snapshots unchanged. Existing limits unchanged, no paidcalls. Visible top error/stages fixed. Build/typecheck251tests/fullapp+ideas+errorbrowsers passed. Refresh aftervisiblev319 and retry existingidea; no need re-uploadZIPs or raisebudget. Hosted/live generation not verified.

## Latest continuation: v0.3.20
Actual user saved response confirms max2048outputtokens,$0.07recorded, complete idea objects before truncation. Added explicit recovery of individually complete strict-schema cards (up to original requested count), pending status/partial-batch notice, immutable raw/usage/cost/noAIcall/idempotence. Normal complete-batch import remains strict and now only offered if parseable; saved raw result visible in Ideas. Provider completion/stop reasons retained; current recorded cost shown. Future idea contract is compact and stage-specific, with300outputtokens/card preflight against qualified allowance. No budget increase or automatic retry. Build/typecheck254tests/fullapp+ideas+count+recoverybrowser checks passed. No live provider calls during build; user's next step is refresh afterv320 and recover latest existing request rather than regenerate. Hosted rollout/live new-output behavior unverified.

## Latest continuation: v0.3.21
User requested PDF/DOCX directly below generated newsletter content and removal of old lower image/export section. Implemented current-editor-text buttons immediately after textarea, empty-content disabled, image optional with checkbox only if existing attached image. Old panel removed (not merely collapsed). No copy/paste/save/image required for export; no AI calls. Build/typecheck/fullapp and focused image/text-only export/browser placement tests passed. NEWSLETTER-WORKFLOW updated. Hosted rollout unverified.

## Latest continuation: v0.3.22
User's review popup stayed blocked but no review request found; activeWork checks any writing/review job for content, so missing review may be blocked by older writing. Added exact inline request type/status/id/time/error/raw result and state-appropriate existing-job controls. Owner can run saved queued job via existing progress endpoint; stale context cannot run/confirm; cancel undispatched only. Unknown requires settings-manager verified provider outcome/cost/evidence with no defaults via existing audited reconcile. Final readiness/report/copy/media/humanapproval unchanged. Tracker uses actual Approve final package wording. Build/typecheck23domainchecks/fullapp+focusedbrowsers passed. No live actions by assistant; hosted state unverified. See REVIEW-BLOCKERS.md.

## Latest continuation: v0.3.23
User logs main/api/studio timedout60s; explicit route now180 verified Nextmanifest, worker/progressalready180. Separateworker503at37.86s below3minlimit shows not that runtimekill; actualoldreviewoutcome unknown. loadState had mislabelled everyDBerror migrationrequired; classifier now distinguishes actualschema,timeout,permission/transient and never resets state on readerror. Added safe phase/trace diagnostics to main/worker incl credential/claim/provider/settlement and actualdispatch time display. Coalesced client refreshes prevent overlappingpolls; readable timeout failures no autoretry. Build/typecheck256tests/fullapp+refresh+reviewbrowsers passed. No live DB migration,billingreconciliation,providercall or approval. Oldunknownrequires verified evidence; HTTP200worker is not proof of reviewcompletion. Hosted rollout/newproduction diagnostics unverified.

## Current release v0.3.24: simplified review
User superseded the earlier two-approval/manual-stage UX. Create → Submit for review starts automatic review preparation within current founder caps; Reviews → read/edit → Approve & publish is the single human decision. Explicit manual override with a reason can bypass delayed/failed editorial checks while preserving the true report/job/billing states. No uncertain dispatch retries. No permission/revision/source-access/immutable-asset bypass. Direct copy/download handoff replaces post-approval scheduling form. Actual platform publishing is still manual. See SIMPLE-REVIEW.md.260domain tests, final targeted checks, build/typecheck, full browser and both focused review browsers passed. No live paid call or actual publication was run. Check footer0.3.24after Vercel deploy.

## Current release v0.3.25: five channels and Ideas previews
User retires Notes/Notebook, Hub, TikTok and Facebook. Active UI projection hides their records without persisting/deleting history; complete ledger still drives spend totals. Live stale requests rejected; retired automations/dispatch prevented. Header names RyzaLab Content Studio and utility controls move below Manage. Ideas expose request date/topic/stable ID; raw provider JSON removed from normal Ideas. Four interactive sample layouts at /ideas-layouts await user selection (do not apply a final design before choice). More options collapses editor support panels. Agent Rules used under writing reports the context actually selected in the saved compiled system.265tests/build/fullbrowser/focusedpreviewbrowser and canonical LinkedIn/Newsletter rules tests pass. No live provider calls, production inspection or platform publication performed. See WORKSPACE-CLEANUP.md.

## Pending deployment: v0.3.26 verified local release
User approved combined Inbox+Board with Table alternate; implementation complete,268tests/build/fullbrowser plus four focused browser suites passed. Persistent idea.stage planning flag does not approve content or spend money; source/detail/draft flows preserved. LOCAL commits on studio-rebuild only: GitHub GH_TOKEN invalid, no fallback login/connector, push failed. Main still0.3.25. All work saved; patch at /workspace/ryzalab-v0.3.26.patch. Reconnect repository authentication, push working branch, then verified release to main; no further design approval needed. See IDEAS-INBOX-BOARD.md. No paid calls/publications.
