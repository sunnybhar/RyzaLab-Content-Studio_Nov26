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

## Midnight Teal revision — 2026-10-28

The review site now has actor-specific persistent Command Center/Production Board choices and collapsible/pinnable navigation. Ideas offers Generate with agent: preview produces explicitly labelled local sample cards, while live mode queues a priced, permission-checked Ideas function job with supplied reference context. Web research remains unavailable until a qualified adapter is implemented. Provider responses must validate as complete structured idea sets and enter pending human review.

All content follows Intake → Evidence → Creation → Independent review → Visual review → Release check → Human approval → Publication handoff → Publication record. The first six checks are required before package approval. Visual N/A requires a genuinely text-only format and a nonblank reason. Human records identify their author and never imply an independent agent ran. Copy edits retain unchanged visual review, format/media edits reopen it, and factual wording changes reopen evidence. Approved packages retain immutable stage snapshots. Publication confirmation requires a passed handoff for the exact selected approved package and a human-supplied destination URL.

Workflow Settings can import uploaded channel playbooks as draft versions for review. Import never activates a workflow or changes protected founder policy. Private channel source packages are loaded on the authenticated server; the public preview imports sanitized sample instructions only. Live idea context includes only drafts the requesting member can read.

## Account, calendar, analytics and training follow-up — 2026-10-28

Both avatars open Account & appearance. Appearance is available from the top bar; Midnight Teal/Daylight Teal and both home layouts persist per actor/device. Browser title is Content Studio RyzaLab; the tab uses a provisional Studio monogram pending the official brand asset.

Calendar now supports human drafting, editing and workflow tasks as well as approved manual publication. Work tasks open their target, move, complete or cancel; no task starts a paid job or bypasses approval. Active planning dependencies protect drafts from Trash. Due notices require maintenance execution. Month publication events open their content; Agenda retains publication controls.

Analytics reports permission-filtered current content inventory, unique approved/published content, recorded approval/publication activity, pending checks, planned work and separate actual cost/reservations. Social performance remains explicitly Not connected. Training & QA provides 13 standalone Word modules, a ZIP pack, a 127-case manual QA workbook and 44-item delivery backlog. Manual QA statuses intentionally start Not run; automated tests are separate evidence.

Validation: 88 domain/export/database/video tests pass, TypeScript and production build pass, expanded production browser walkthrough passes including themes, profile controls, work task targets and training downloads. Word/Excel/ZIP structures verified and desktop appearance/analytics screenshots inspected. No credentialed external provider, OAuth, email or production database actions performed.

## Saved Ideas response recovery

Internal file/section citations now import as bounded plain-text sources; citations are not verified URLs or executable links. Longer format descriptions are retained. Completed Ideas jobs with a saved response and no imported cards offer Import saved ideas — no AI call. Recovery reads the server-retained result only, checks permissions, imports the whole valid set as pending once, leaves dispatch attempts/raw response/budget reservation untouched and never calls a provider. Invalid/partial results still reject. 93 tests and production build pass; browser fixture verifies the recovery button creates a visible pending card from internal citations. Actual user recovery awaits their explicit click after deployment.
