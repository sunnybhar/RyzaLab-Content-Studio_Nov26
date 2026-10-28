# Review-first website rollout

The user authorized replacing the existing website to review the rebuilt Studio. The root URL redirects to `/preview`, an explicitly labelled isolated browser demo. This remains demo even if production Supabase variables exist. It never reads production Studio records, sends email, uploads private media, or makes paid API calls. Demo API-key input is discarded. `/studio` is the live integration entry and requires the new migration/configuration.

## What can be reviewed now

Home and nine channels; idea creation/approval/reuse; independent drafts and slide/scene source editors; unified channel Workflow Settings; per-function AI connection settings; profiles and scoped controls; human review snapshots; calendar tasks and human-confirmed publication; references/templates/history/Trash; DOCX/PDF/PNG/source/subtitle exports. Sample data is clearly labelled, and unconfigured external operations show errors rather than fabricated successes.

## Tested locally

TypeScript and optimized Next.js build, domain security/state regressions, real PostgreSQL CAS/immutable records using PGlite, DOCX/source export round trips, and real FFmpeg H264/AAC composition in three ratios with captions/audio and path-containment tests. Full browser walkthrough is run on the built preview before the release checkpoint.

## Still requires configuration or further implementation

No live Supabase migration or data validation was performed. Auth/OAuth, private storage, Google Docs token renewal, transactional email, provider requests and actual costs need credentialed preview tests. Automatic Docs synchronization, full hosted scene generation/render orchestration, current-web research adapters, complex visual layer manipulation, complete campaign/inventory exports and production-scale history archival are not completed launch outcomes in this checkpoint. The implemented local renderer demonstrates real composition, not a qualified AI video provider. Per-function models/credentials are configurable; unavailable capabilities are not faked.

The server rate card and paid execution gates remain closed. Hosting options are compared in HOSTING-COMPARISON.md; no paid worker or video provider was chosen. Publishing remains manual throughout.

## Deployment

Push tested commit to studio-rebuild for backup, then fast-forward main only because the user explicitly authorized replacing the current site. Vercel may automatically deploy from GitHub; verify its deployment result separately. GitHub API access is forbidden in this execution environment, so deployment status/URL cannot be asserted from a successful Git push alone. Do not apply database migration merely to publish this review site.
