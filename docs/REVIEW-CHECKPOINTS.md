# Development review evidence

## Before implementation

GPT-6 Astra reviewed the existing prototype and proposed command/CAS design. It identified broad legacy mutations, service-role access without scopes, mutable review state, request-count rather than money budgets and session-only images. The singleton server-authoritative CAS design was conditionally accepted for a small single-tenant workspace with immutable release/audit records, complete response filtering, exact scopes, encrypted credential separation and durable unknown-outcome handling.

GPT-6.1 Sol implemented the new interface and document/media export utilities, domain tests and local video composition under the root integration work.

## Before release checkpoint

GPT-6 Astra reproduced stale workflow/policy approval, stale manual-publication package confirmation and invalid media approval. Fixes add expected workflow/rule/package IDs; freeze actual workflow, protected rules and reference snapshots; validate private retained assets at approval. Regression tests cover each case.

Astra also required server-qualified pricing rather than trusting user estimates, reservation-month checking before dispatch, function scope for connection configuration, and queue progress around blocked jobs. Implementation adds a qualified server rate-card gate, frozen pricing/output bounds, blocked old-month dispatch, function-scoped checks and quarantined blocked jobs. Provider success does not invent actual billing: the conservative reservation remains until reconciliation.

No reviewer claimed live Supabase/Google/email/provider tests, paid media generation, production migration, or deployment. Those remain explicit external configuration/authorization gates. A final code review checkpoint is required before merge to main.

## Backlog follow-up — final focused review 2026-10-28

GPT-6 Astra identified four blockers: stale incoming-Docs modal imports, incoming branch loss on baseline reversion/relink, incomplete/object-error research misclassified as cited, and an undeclared notification-outbox recovery gap. Fixes pin the displayed incoming timestamp, retain both branch-clearing paths in history, require completed end_turn research with no tool errors, and explicitly exclude delivery evidence while forcing email-disabled local recovery until reconciliation. Astra re-reviewed the changes and all 19 focused tests passed; no remaining blockers found in that reviewed scope.

The full 126-test suite and optimized build pass. Live provider qualification, production recovery acceptance and archive cutover remain separate. This review does not claim live Google/provider/email tests or completed archival.

## Workflow UX and connection editing — 2026-10-29

Astra focused review cleared collapsed version tiles, read-only native instruction dialogs and explicit binding summaries. Editing bindings uses existing workflow.save to create a new draft; activation permission remains separate. Reviewer found disconnected current options could silently clear; fixed by preserving and labelling the current option. Browser regressions verify unchanged saves, explicit removal and preservation of active version, instructions, credentials and packages. No backend authorization changes or credentialed calls.

## Same-card workflow editing — 2026-10-29

User rejected the unshipped archive approach. It was completely removed. One current workflow card with internal revision history replaces the version-card list; draft saves retain identity/version and show Updated time. Active/review inputs remain immutable pending a new internal revision and activation. Astra required timestamp tokens on every id-bearing save and strict advancement within the same millisecond; fixes verified with four focused tests. Focused review cleared, full130 tests pass. No deletion/archival command or database migration shipped.
