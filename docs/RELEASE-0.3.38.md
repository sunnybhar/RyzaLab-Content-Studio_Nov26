# v0.3.38 — recover allowance confirmations after database timeouts

The reported screen has saved research and an idea request waiting for allowance approval. The database save timed out; the loaded state does not establish that generation started. Production trace c3b4b05e-28b0-4bb7-b1be-5fcc8dc7d2f5 should be matched to server/database logs before claiming the exact incident root cause.

Changes:
- Confirmation uses the existing request ID. After an ambiguous database save, read back its state; a saved approval returns without another reservation or provider call.
- Already queued/running/completed requests are idempotent on confirmation. Only a definite version conflict can retry the same waiting approval once; a timed-out write is never silently repeated.
- Failed confirmation refreshes the existing state. Manual status checks clear stale request errors after a successful read; authoritative queued/running/completed state clears stale confirmation errors.
- Pending approval shows “Not started — waiting for approval”, not “Stopped”. Error text uses a block layout to prevent the narrow stacked heading seen in the screenshot.

Database performance update (separate from app rollout):
1. Open the application's project in the Supabase dashboard.
2. Open SQL Editor → New query.
3. Paste and run the complete contents of `supabase/migrations/20261108_studio_commit_history_performance.sql` once.
4. Back in Studio, check the existing request status; if it is still awaiting confirmation, approve that existing request once.

This function-only migration keeps all history, service-only access, exact immutable package/audit evidence, version checks and atomic secret writes. It replaces repeated historical array scans and per-item SQL with keyed evidence checks and set-based inserts. A local 600-record PostgreSQL fixture measured 52ms before and13ms after; production performance is not inferred from that fixture. It is additive after `20261027_studio_v2.sql`; it does not initialize/reset the workspace or modify saved editorial content.

The SQL update has NOT been applied to hosted Supabase from this environment: no database credential or database connector is available. Application deployment alone does not replace a database function. Do not rerun the old baseline migration after this update, because it would reinstall the slower function.

Validation: all348 domain tests and production build/TypeScript pass. Tests cover ambiguous committed/uncommitted approvals, safe CAS retry, unreadable outcomes, immutable package/audit mutation/removal/duplicates, browser permission denial, secret rollback and version conflicts. Progress browser checks waiting/error layout. Production app smoke is recorded in WORK-IN-PROGRESS.md. No paid provider request or operational publication was made. Hosted rollout and the reported database incident remain separately unverified.
