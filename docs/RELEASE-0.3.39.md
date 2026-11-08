# v0.3.39 — reduce Supabase egress from status polling

The supplied usage screenshot shows73.463GB egress against a5GB allowance, while database size is35MB and file storage is negligible. Code inspection found full-workspace reads in frequent client and worker polling. These are concrete transfer amplifiers; their exact share of historical usage is not measured here.

Changes:
- Existing clients send the last workspace version. The server reads only version/membership first, verifies current membership and returns304 with no workspace body when unchanged. Initial loads and genuine version changes still load the workspace; this is not a fully normalized database rewrite.
- All components sharing the client use one15-second background refresh gate and one in-flight request. Hidden-tab polls do not fetch. Explicit save reconciliation and approval status checks bypass the background delay.
- Cached workspace identity resets when the signed-in account changes. Membership is checked before unchanged responses; revoked users cannot receive a cache-valid response.
- Running-job status uses a compact server projection with current ownership and scoped permission checks. It does not return prompts, results, uploaded files or history. Actual queued execution/reconciliation still performs fresh full authorization and CAS checks.
- Job progress responses no longer include another full workspace or perform a redundant final full read. The client refreshes after actual execution.
- Unattended workers query compact database-side due flags before loading the workspace. No queued/expired work, no pending email, and unchanged/not-due maintenance do not download workspace state. A leased maintenance checkpoint prevents repeated idle scans and wakes due planning/recurrence/Docs/trash work.
- Worker failures back off up to five minutes. Missing low-bandwidth RPCs fail visibly rather than silently falling back to bulk polling. Email without an adapter does not poll the workspace. Verification-page ticks pause when hidden and run every15seconds.

## Apply once in Supabase

Run the complete file `supabase/migrations/20261108_studio_egress_control.sql` in the current project's SQL Editor. It adds service-only status functions and a maintenance checkpoint table. It also includes the earlier save-history performance optimization, so this one script covers both database updates. No editorial data/history is deleted. Do not rerun the older baseline migration afterwards.

Until that SQL is applied, unattended worker polling and compact job-progress calls report a setup error and do not fall back to downloading the workspace. The client version-check improvement does not need the new RPC. Keep existing working-copy downloads before refreshing an uncertain draft.

Application release and database installation are separate: the SQL has NOT been applied remotely from this environment, which has no database credential/connector. The portable Render worker should also redeploy from main to receive its error backoff.

## Verification and limits

Focused domain/real PostgreSQL fixtures verify small payloads with a large private document present, current membership/ownership, hidden-tab/concurrent polling, unchanged304 handling, account isolation, pending/time-based work, lease completion, notification deduplication and browser-role denial. All353 domain tests, production build/TypeScript, full app/submission browsers and focused refresh/authorized-job browsers pass. Final SQL fixture also checks archived-channel recurrence suppression. Details are recorded in WORK-IN-PROGRESS.md. No paid provider call, production database change, deletion or publication occurred.

Already recorded73GB usage is not erased by a code change. Supabase may continue restrictions for the current allowance period. Current reset date/restrictions must be checked in its dashboard. Real editing still reads the canonical workspace, and sustained future usage must be measured before promising the app fits any free plan. The previously requested full-service migration remains separate and unbuilt; it must retain these transfer fixes.
