# RyzaLab Training — Operations — Health, Incidents and Recovery

Version: 2026-10-30 | Audience: Founder or administrator with settings permission

## Objective
Inspect recorded failures and dependencies without mistaking a reachable app for a live worker.

## Before you start
Open a live administrator workspace for real health checks; preview uses local fixtures.

## Availability
Available in preview. Live operation requires the configured /studio workspace. Release 0.3.0: the two-decision flow requires explicit founder adoption; any legacy stage instructions below apply only before adoption. No paid provider or live-account acceptance is implied by these documents.

## Step-by-step workflow
1. Open Operations using its sidebar button. In preview no external health request is made.
2. Click Refresh health checks. Inspect database, private asset bucket, encryption configuration, provider execution gate, Google/email configuration and delivery outbox status. These checks report booleans/statuses, never secret values.
3. Read workspace bytes and the current 24 MB command-store limit. Production-scale archival cutover is still under architecture review; do not delete release evidence to make room.
4. Review uncertain, expired, failed, blocked or long-queued jobs. A running job whose lease expired requires reconciliation; do not submit another potentially charged request.
5. Use Open jobs and reconciliation to inspect raw results and record actual outcome/cost using authorized controls. Budget reservations are not actual invoice charges.
6. Review Google Docs conflicts/errors in the linked draft. Automatic mode is founder-controlled, requires an initial manual fetch and preserves competing Studio and Docs versions.
7. Worker heartbeat is not tracked. Inspect Render logs to establish whether the worker is currently processing. Successful database checks alone do not prove worker liveness.
8. For trusted operator backups, follow docs/BACKUP-AND-RECOVERY.md in the repository. The encrypted application backup and local SQL drill do not replace Supabase Auth/project recovery or a live staging restore test.

## Expected result
Operators can identify incidents and next actions without exposing keys or replaying uncertain jobs.

## Practice exercise
In preview, inspect a blocked/unknown fixture job. In a credentialed test workspace, refresh checks and compare them with Render logs.

## Common problems and boundaries
Only administrators/founders can inspect server health. External email, Google, research pricing/model qualification, platform Auth recovery and final independent review remain separate acceptance items.

## Completion checklist
- I can locate this section and explain its purpose.
- I completed the practice exercise or marked the live dependency as blocked.
- I recorded actual results in the QA workbook.
- I did not treat preview samples as real agent output or live publication.
