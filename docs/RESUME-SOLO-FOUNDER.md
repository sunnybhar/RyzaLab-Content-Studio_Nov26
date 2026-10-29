# Resume the authorized solo-founder build

The user said Start, then asked for everything saved before the session limit. Continue implementation; do not restart design, request the same approvals, deploy unfinished code, or claim the build is complete.

## Git and authorization

- Repository /workspace/RyzaLab-Content-Creation, remote sunnybhar/RyzaLab-Content-Creation.
- Working branch studio-rebuild. Latest code checkpoint8520ccc; documentation checkpoint follows.
- Live main094b69c. Never deploy WIP. User already authorizes verified main release after checks.
- Git author sunnybhargava1611@gmail.com. Push every five minutes while active. Read AGENTS.md.
- No paid provider calls, live database writes/migrations, emails or social publishing during implementation.
- User selected Claude/OpenAI/Gemini for text functions; media integrations remain unqualified/pending. Do not fake completion.
- Confirmed TWO human reviews (copy then full package), routine spending within initial50c total preparation/$5month, ask exceptions only. Adoption is an explicit founder policy command in the future UI. No live settings changed.

## Current evidence

TypeScript and all146 tests pass. Tests: npm run typecheck; npm test. New tests tests/studio-solo.test.ts cover the domain scaffold and review findings. No new integrated browser/build result is claimed yet. docs/design/solo-founder-v1 contains approved12-pagePDF/clickablewireframes; docs/SOLO-FOUNDER-IMPLEMENTATION.md has the work checklist. Other current release tests/browser.mjs is the OLD UI walkthrough and needs expansion for new flows, while legacy behavior should still be covered.

## Backend work already saved

- lib/studio/output-contracts.ts: strict selected-piece JSON and review JSON contracts; questions/sources retained.
- lib/studio/solo-quality.ts: exact copy identity with content ID/text revision/words/destination/workflowactivation/rules/policy/references, current acceptance, deterministic blockers, required independent report/Notes readiness. Reports are not fabricated six human passes.
- lib/studio/draft-candidates.ts: target-safe settlement, current permission checks after dispatch, incomplete/invalid/conflict retention, no overwriting manual or accepted/reviewing/trashed content, existing media preserved, questions hold autoapplication.
- lib/studio/preparation-budget.ts: stable authorization, globalcaps plus lifetime content consumption including untagged historical jobs. All two-step content operations require applicable preparation; no confirmed-job bypass.
- Engine policy.adoptSolo (Founder policy.manage), preparation.authorize, content.acceptCopy (package.approve scope), job.applyDraft (manual question disposition), connection.default, idea.use (idempotent linked draft).
- Final package.approve in two-step compares current acceptance/policy IDs, retains policy/copy/report snapshots, enforces Founder authority for Notes and actual independent report, explicitly records human final handoff atomically. Legacy checks stay intact when policy absent.
- content.save now enforces destination account permission and advances text revision for destination/format/slide wording; old acceptance cannot resurrect on reversion. Restore clears inherited copy/report/preparation. Workflow activation gets fresh activationId.
- lib/studio/generation.ts builds canonical actual-content requests. New content.generate is transformed server-side to priced job.enqueue. ONLY trusted context.canonicalGeneration may assign authoritative outputContract and auto-confirm within preparation allowance; raw browser prompts cannot certify unrelated content.
- Enqueue pins target revision/copy identity/current acceptance/connection snapshot. Providers return structured completion state and receive strict output contract. Quote includes contract bytes.
- Worker dispatch checks preparation + model snapshot. Settlement invokes shared safe candidate attachment. No complete orchestration/follow-up review yet.

## Critical next work

1. Read latest WORK-IN-PROGRESS tail and relevant code; preserve existing changes. Obtain focused reviewer recheck of fixes (previous review found4P1s+questions/media issues; six regressions now pass). Existing architecture_review agent can review; do not claim exact Astra routing if unavailable.
2. UI/API integration: explicit Founder one-time adoption (initialuseradmin may assign Founder through existing audited People flow; never silently escalate). Show package cap/use and exceptions inside draft.
3. Add direct Use idea -> linked draft, inline Generate/Revise and status/result recovery, safe saved-candidate diff/manual apply. No copy/paste from Activity. Add truthful AI reviewer orchestration after copy/asset changes within same budget. Automatic only under configured provider/prices/authority.
4. Two-review UI: copy acceptance facts/source findings, then final exact copy+media report preview. Permission/version/source changes invalidate correctly. Ordinary no-required-independent can be human-reviewed honestly; Notes/requiring independence must hold without real qualified separate-provider report. Never label same-model second pass independent. Add human handoff decision + planner after approval.
5. Function matrix AI settings, create/edit existing connection with active/unknown job guard, reuse encrypted credential server-side, provider model listing with pagination/fixed URLs/redacted errors. Current connection endpoints only create; no new model-discovery endpoint yet. Settings.defaultConnections exists but UI/resolve adoption not complete. Current workflow explicit bindings override defaults. Missing vs explicit-disabled/inherited routing needs clear treatment.
6. Server-maintained qualified rate catalogue editable via protected Studio UI (Settings.qualifiedRates type scaffold only; readRates currently env-only). Do not let arbitrary client estimates self-qualify. Keep source/date/capability validation and worker snapshot matching. Official docs fetch was blocked403 in design session; no invented current model catalogue.
7. Ideas list/tile/detail popup. Activity latest10completed +allactive +older searchable/paginated popup, incomplete shows Needsattention. Remove Queue request jargon from normal flow.
8. Calendar: Ready-to-schedule approved packages, immediate planner, exact approved destination read-only, read-only text/image/slides/video preview with auth asset fetching, edit link opens working draft, explicit scheduled snapshot replacement, no duplicate task on repeated planner submits. Schedule.manage independent of package approval. Actual publication remains human-confirmed URL.
9. Horizontal Channel setup and selected indicators everywhere. Move tall Human by design sidebar message into compact homepage header. BL054 was queued, not implemented yet.
10. Root-level tests/build/browser and focused final integrity review; refresh14 training modules/QA/backlog honestly, then push verified release to main. Current latest shipped docs have160manualcases/54backlogitems; all manual cases Notrun. Backend scaffolding passing tests is NOT complete UI/provider acceptance.

## Useful cautions

- Main entry /studio is live; /preview is separate local demo. User previously believed data lost due preview. No resets/clearbrowserstorage.
- Existing runtime Secrets AESGCM, CAS studio_commit and private assets; no schema rollout needed for additional canonicalJSON fields. Keep scope filtering for new preparations/candidates/reports.
- Existing worker is Render Node poller calling Vercel, not an external queue UI. Preserve durable leases, unknown outcomes/reservations and no paid auto retries.
- Old seeded previews remain legacy unless policy explicitly adopted; keep old tests and add new-mode fixtures rather than secretly weakening requirements.
- Native review dialogs currently close before custom global dialogs. Preserve modal focus/interaction and exact snapshot controls.
- UI code mostly components/workspace.tsx/css; split new components to keep ownership clear. Asset GET requires bearer token; use existing authenticated asset fetch/export utilities, not plain private img URL.
