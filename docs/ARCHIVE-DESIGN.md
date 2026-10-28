# BL-036 — History archival cutover proposal

Status: focused architecture review complete at proposal level; not deployed or represented as completed scale support. Current command store retains the 24 MB guard. The Operations page exposes actual canonical size so capacity is observable.

## Why a table alone is insufficient

Each commit currently resubmits one canonical state document. Release packages and audit rows have immutable table copies, but the commit function also compares their canonical arrays. Removing old audit/package values from JSON without changing that contract would reject legitimate commits or weaken integrity. Old content revisions additionally appear in the browser's Versions view and restore-as-new-draft path. This requires a coordinated RPC, store, read-permission and retention migration.

## Proposed durable model

- Immutable `studio_history_chunks`: content ID, chunk ID, retained revision IDs, payload JSON, SHA-256, creation timestamp and retention classification. Service-only reads/writes; no browser grants.
- Canonical content retains the current draft, a bounded recent-history window and archive cursor/count. No approved payload changes. Each archive transaction writes and verifies a chunk before atomically removing those exact history entries from the canonical document under the existing expected-version CAS.
- Approved packages remain exact rows in `studio_release_packages`; their IDs and dependency graph remain resolvable. Audit reads paginate `studio_audit` under current membership/content visibility; current audit events cannot be discarded without proving identical immutable persisted rows.
- Runtime commands resolve relevant snapshots on the server, never accept replacement state from the browser. The source content's current permission scope gates every archive page/read and restore request. Revocation applies immediately.
- Historical restore always creates a new unapproved draft and never restores stale grants, connections, approvals or provider authority. Unknown/dispatched jobs are reconciled rather than restored for replay.

## Required atomic operations

1. `archive_content_history(expected_workspace_version, content_id, expected_revision_ids, chunk, digest)` validates exact source entries and current authorizer scope, inserts immutable chunk and commits reduced state in one transaction.
2. `load_history_page(content_id, cursor)` authenticates server-side, resolves current ownership/channel/account scope and returns bounded records and next cursor. A client-supplied content ID is never sufficient authorization.
3. `restore_archived_revision(content_id, revision_id)` resolves the immutable stored revision after current edit permission and creates a new draft with fresh IDs/revisions and empty stage checks.
4. Retention cleanup explicitly distinguishes unapproved working history from release dependencies. Trash expiry must not create accessible orphaned chunks or remove evidence referenced by a retained release. Permanent release removal remains a separate explicit founder-governed decision.

## Migration and rollback

Deploy additive schema and dual-read support first. Exercise real PostgreSQL CAS, stale snapshot rejection, scope changes/revocation, immutable chunk tamper rejection, partial write rollback, historical release linkage, Trash dependencies and restore-as-draft on a staging Supabase project. Archive a small test content history only after these checks. Preserve a verified platform backup plus encrypted application archive and its separate encryption material.

Rollback before any archival transaction is additive-only. After cutover, roll back only to a dual-read-capable release; an old JSON-only application cannot safely interpret reduced history. A backfill that reconstructs canonical history must preserve capacity limits and immutable evidence and is not an automatic production rollback.

## Release blockers

Astra architecture review is complete at the proposal level. Implementation must first define the canonical package/audit reference contract across all consumers, canonical server digests and unique/idempotent chunk ownership, stable scoped pagination, dependency-safe media rebinding on restore, and backup/export/drill coverage for offloaded evidence. Retention must fail closed for dependencies, and growth in jobs/stages/notices still needs measurement. Live Supabase staging credentials and migration acceptance are not available to this agent. No destructive canonical trimming, production migration, guessed scale claim or silent retention exception is authorized by this design document. Other backlog items continue independently.
