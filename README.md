# RyzaLab Content Studio — rebuild branch

Founder-first editorial workspace for ideas, nine content channels, versioned agent workflows, human review, immutable approved packages, Google Docs/DOCX, editable media, calendar tasks, scoped profiles and manual publication. No Notion or automated social posting. The public root opens the labelled `/preview` review experience. `/studio` is the configured live entry. This is an implementation/preview checkpoint, **not a claim that all production integrations are ready**.

## Local workspace in VS Code

Open the GitHub checkout in VS Code. With Node.js 24 LTS or 25.6.0, run these commands from the integrated terminal:

```sh
npm ci
npm run dev:local
```

Open http://localhost:3005. Studio runs on the loopback interface with no sign-in or Supabase configuration. Workspace data is stored in `.studio-local/studio.sqlite` inside your checkout. Git ignores that directory. To back up the workspace, stop the dev server first and copy the entire `.studio-local` directory. It may contain your encrypted API credentials and their local encryption key. Keep the backup private. The first launch copies existing browser workspace data from the same browser profile and localhost address when the database is empty.

Use the local workspace for drafting, reviews, approvals, and exports. Browser preferences remain in the browser. Hosted integrations and private asset uploads still use the Supabase-backed workflow below. Moving workspace data to a later hosted deployment requires a separate import.

### Research, ideas, writing, and review locally

Under **AI & budgets**, set a **Monthly AI budget** in **Spending** and add a writing connection under **AI Connections**. Enter the provider API key and select an exact model. Saving checks account access, keeps the key encrypted in the local workspace, and selects the first writing connection as the default. Use **Use as default** to switch the model for channels without an override.

- In **Ideas**, choose **Generate with agent**. Studio searches public sources for the topic and saves generated ideas with their references. Use **Use saved research or add source links** to supply your own links.
- In **Create**, open a saved draft and choose **Generate draft**. Edit the public search topic or add public links before generating. Clear the public topic and links to write using only saved references and your instructions.
- Open a saved draft with copy and choose **Run AI review** to see findings on that revision. Final approval stays with you.

The default writing connection also handles ideas and review unless you set separate models. Workflows that require independent review still need a reviewer from a different provider. Paid jobs use the one monthly budget and reserve an estimate before dispatch. Studio sends the relevant instructions and references to the selected provider. Public queries and URLs go to the research services. Unknown costs retain the reservation, and uncertain requests are never automatically retried.

Anthropic, OpenAI, and Gemini text models need verified pricing. A qualified token-based writing rate can cover ideas and review for the same model. Local estimates include the existing Claude Sonnet 5.5 rate and standard text rates for OpenAI GPT-6.2 Astra and Claude Opus 5.5 from a pinned public pricing registry. Other models require a qualified rate from the workspace or `STUDIO_RATE_CARD`.

### Images, video, and voice examples

In **AI Connections**, add a separate **Image** connection for OpenAI GPT Image or a **Video** connection for Gemini Veo 3.1. Add a qualified fixed-price rate for the exact 1024 × 1024 medium image or 8-second 720p landscape video preset through the server rate registry. In a saved draft, use **Write** for images and **Video & audio** for clips. Get an estimate before generating. Video requests continue on the provider; use **Check video progress** to retrieve that same request. Results are saved in the local SQLite database for preview, download, or attachment to the draft. The existing per-post ceiling still applies.

To bring in older posts, open **Agent Rules → RyzaLab tone and original content voice → Import posts from ZIP**. Each supported document is saved as its own example. Images and other non-document files in the archive are skipped. Imported examples are kept in the workspace database.

### Export a newsletter using your Word template

On a local draft in **Create → Newsletter**, upload your `.docx` files in **Newsletter template**, then select one for the draft and download DOCX or PDF. Templates and selections live in the local SQLite database. The exporter keeps embedded cover art, the document's headers, footers, and Word styles. It replaces the template's example body and editorial prompts with your current newsletter copy.

For a PDF using an uploaded template, install [LibreOffice](https://www.libreoffice.org/download/download-libreoffice/) on the same computer. Studio looks for the standard macOS application or a `soffice` command. Set `STUDIO_SOFFICE_PATH` to the executable for a custom installation. DOCX and standard-layout exports are available independently.

## Supabase-backed development

Node.js22+; Node24 LTS recommended. Open this folder, then:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

The dev/start scripts use port3005. Without public Supabase settings the app opens an explicit isolated browser demo. It never calls paid APIs, sends email, uploads files, or pretends to fetch Google Docs. Demo changes are stored in this browser; demo API-key entries are discarded. Clear browser storage to reset.

## Existing Supabase migration — do not replace the live database blindly

1. Back up your current database and review the migration on a preview project first.
2. New project: apply `supabase/schema.sql`, then `supabase/migrations/20261027_studio_v2.sql`. Existing project: apply only the new migration after checking the original tables exist.
3. The migration preserves old tables/rows, closes their broad browser mutation policies and adds private server-command state, immutable release/audit records, encrypted secrets, private asset metadata, and the notification outbox. The **old UI will lose write access** after this migration; coordinate UI rollout and recovery. Do not apply it to production while still serving the old app.
4. Set Supabase URL, public anon key and server-only service-role key in `.env.local`. First initialization requires an existing legacy admin account; legacy members and drafts are imported, without turning prior review status into release approval. Legacy drafts are initially assigned to the initializing admin because original user IDs are not mapped to emails automatically; reassign explicitly in Studio. Original tables remain recovery sources.
5. Once initialized, Studio state is the membership authority. All commands and workers check it. Public signups stay disabled. Google identities still need an assigned membership.
6. Create/update an auth password with `npm run account:password -- your-email@example.com`; this is a trusted local admin tool and sends no email. Add the first admin to legacy `public.members` only if not already present (see schema footer). New team auth accounts can be created with the optional initial-password field in People, then profiles assigned. Email/password does not require SMTP.

## Profiles and workflows

Admin user management is distinct from founder editorial authority. The initial existing admin can explicitly assign Founder (including to themselves) through an audited action. Profiles: Founder, Administrator, Manager, Editor, Creator, Viewer. Multiple profiles allowed. Per-function/channel/account/content grants are checked together within one grant. Explicit grants replace profile defaults for non-admin/non-founder users. Assigned content is required for ordinary content access. Founder-only protected rules are separate from writer-editable workflow configuration.

Unified Workflow Settings contains instructions, audience, guardrails, selected brand/source/example references, output format, checks and per-function AI bindings. Save creates a draft version; submit then activate. Activation and new approvals never mutate earlier approved packages. Text edits leave media revisions alone. Human approval captures exact text/media/workflow/rule/reference snapshots; stale review requests fail rather than silently approving unseen versions. Price/“free” wording requires an exact-line, exact-revision founder exception recorded in review. That exception cannot waive misinformation or misrepresentation blockers; evidence-priced article handling is still conservative rather than fully contextual.

Publication is manual. Calendar tasks select approved packages explicitly. A person posts externally and supplies a matching HTTPS URL; state is **human confirmed**, never platform verified. No social account credentials are requested.

## API credentials and generation

Generate a **server-only** encryption key once:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Save it as `STUDIO_ENCRYPTION_KEY` in secure local/hosting environment settings. Keep a secure backup and do not casually rotate it: existing encrypted connections require the original key. Never commit or share it.

Founder/permitted admins add provider credentials in AI Connections. Each function has its own provider/model connection. Stored keys use AES-256-GCM with unique nonces; responses contain metadata only. Read-only model access validation lists models through fixed official endpoints. It does not prove generation quality or price. Workflow bindings determine connections; creators cannot override them at request time.

Current deployment work is Claude-only. Text adapters for Anthropic, OpenAI and Google and existing OpenAI media adapters remain in source, but new media integration work is deferred. A bounded Claude web-search research adapter is implemented behind a separate model/tool and fixed-total-cost qualification gate; live research and AI scene-video remain unqualified. No fake research or video success is returned. Model IDs must be verified with your account. Claude is not an image-generation service.

Paid jobs require all of: non-zero applicable budgets; a qualified server `STUDIO_RATE_CARD`; approved connection allowance; validated model access; `STUDIO_ALLOW_PROVIDER_EXECUTION=true`; and an authenticated worker. **Leave execution false until costs and tests are authorized.** No actual credentials or guessed rate card is shipped.

Rate-card entries are JSON with provider/model/function, USD input/output cents per million, maxInputBytes/maxOutputTokens, optional fixedCents, authoritative source URL, verifiedAt and qualified:true. Server calculation uses the frozen prompt/reference UTF-8 byte upper bound plus protocol allowance and bounded output. Qualification must validate provider-specific token/extra-charge assumptions; the JSON flag alone is not evidence. Large input, absent pricing, old-month reservations and changed qualifications block dispatch. User-supplied estimates never authorize charges. Successful output leaves conservative spend reserved pending actual invoice reconciliation; it is not relabelled actual spend.

A durable queued job persists frozen inputs, budgets, workflow/rules/references and idempotency identity before dispatch. Claims persist leases/dispatch markers first. Unknown transport outcomes retain reservations and never auto-retry. The user deployed the portable worker on Render; live restart, lease recovery and uncertain-result reconciliation acceptance remain to be completed. Run `npm run worker` only after configuring server/worker environment. It polls maintenance, notifications and generation routes; do not expose its token to browsers.

## Google Docs

Configure Google sign-in in Supabase separately. Optional Docs connection requires Google Cloud OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) and `STUDIO_APP_URL`. Register `${STUDIO_APP_URL}/api/studio/google/callback` as the authorized redirect. The connector uses read-only Docs access because editing happens in Google's editor. Tokens/refresh tokens are encrypted server-side. Each draft links a document ID; manual Fetch latest preserves displaced Studio text and does not alter approved packages. OAuth errors are visible; no credentials have been live-tested here. Manual fetch is the default. Optional founder-controlled automatic sync checks one due linked document per maintenance pass, requires an initial manual baseline and authorized document owner, and holds conflicts or changes to reviewed/approved drafts for human comparison. It preserves displaced text and incoming versions. Google OAuth, renewal and live conflict acceptance remain unvalidated.

DOCX import/export works locally. Imports text, not arbitrary Word layout/comments/tracked-change fidelity. PDF written exports and carousel PNG/PDF are generated from the selected version. Media project JSON retains editable layout/scenes/audio/captions; no native .fig/PPTX promise.

## Media and real MP4 composition

Private direct-to-storage uploads use signed paths to avoid serverless body size limits, up to50MB each. Keys are unique; approved files cannot be overwritten through the application. Exports fetch authorized private assets; external URLs cannot masquerade as approved media. Actual Supabase storage remains a credentialed acceptance test.

The local composition worker is real, not a mock. Requires FFmpeg, FFprobe and DejaVu Sans for burned captions:

```sh
npm run render:video -- --project project.source.json --assets-dir ./assets --output ./final.mp4 --aspect 9:16 --captions
```

Exports1080×1920,1920×1080 or1080×1080 H264/AAC. Uses local video/still sources, source/preserved or replacement audio, editable SRT and retained source JSON. No network fetching or paid generation. Local asset paths must remain inside the allowed asset directory. Source clips can be generated elsewhere/uploaded; full hosted AI scene generation and in-Studio render dispatch remain unqualified integration work, not demonstrated finished AI generation.

## Notifications, retention and hosting

Inbox events work. Optional Resend adapter requires EMAIL_API_KEY and a verified EMAIL_FROM; it is separate from login SMTP. Durable delivery claims and provider idempotency avoid repeated event sends; unknown delivery needs reconciliation. No real emails were sent in development. Provider selection can change behind the adapter.

Timezone defaults New York. Unmatched review/task routing uses founder, with initial admin fallback until founder is configured. Due unready tasks block and require explicit rescheduling. Recurring occurrences currently pause with a clear authorization event instead of silently spending; automated qualified recurring generation/research confirmation remains incomplete. Trash retains working content90days and protects package/task dependencies. Approved/released snapshots remain retained. Canonical Trash expiry does not erase legacy import tables or external backups; their deletion policy needs coordinated migration ownership.

See `docs/HOSTING-COMPARISON.md` before selecting web/worker hosting. No host migration or production database change has been performed. The user has authorized replacing the existing website with the review-first preview; see `docs/PREVIEW-RELEASE.md` for deployment boundaries.

## Validation

```sh
npm test
npm run typecheck
npm run build
```

Tests include PostgreSQL migration/immutability/CAS using PGlite, permission and approval regressions, budgets, Docs conflict history, source/DOCX round trips, and actual FFmpeg video/audio/caption outputs when installed. Browser checks use `npm run test:browser` against the new labelled demo. Live password/Google authentication, Supabase RLS/storage, Google Docs, notification delivery and actual provider billing require your preview credentials and are not validated by demo tests.

Development models: GPT-6.1 Sol implements/fixes and refines screens; GPT-6 Astra reviews architecture and permission/approval/manual-publication integrity before implementation and before release. These are separate from Studio runtime API models. See `docs/REVIEW-CHECKPOINTS.md`.

### Review stages and channel instructions

The Midnight Teal interface offers Command Center and Production Board views, with actor-specific sidebar/layout preferences. In Ideas, **Generate with agent** creates pending idea cards. Preview uses clearly labelled local samples. Live generation requires an Ideas connection, validated pricing, budget allowance and a worker; Ideas generation uses supplied references. Separate Claude web research requires explicit model/tool/cost qualification and reviewed citation results before reuse.

Use **Workflow settings** to import channel instructions as a draft, edit instructions/brand references/guardrails, and submit and activate the reviewed version. Import does not override protected founder policy. Every content item shows nine stages. Record the first six human checks before approving a package, then record its exact package handoff before confirming manual publication. Text changes preserve unchanged visual checks; format or media changes reopen them. Publication is always performed by a person outside Studio.

### Training and acceptance testing

Open **Training & QA** in the sidebar for 14 standalone Word training modules, the 160-case manual QA workbook and the 54-item delivery backlog. Source guides and downloads are in [docs/training](docs/training/README.md). To regenerate with Python, install `python-docx` and `openpyxl`, then run `python scripts/generate-training-materials.py`. These are documentation-generation dependencies, not application runtime dependencies.

Both avatars open Account & appearance. Calendar supports human drafting/editing/workflow tasks separately from approved publication. Analytics reports real Studio records; social reach/engagement remains unconnected.

### Current backlog batch

Carousel slides support editable text and rectangle/ellipse layers, position, order, opacity and PNG/PDF/source export. Operations provides administrator diagnostics and real job alerts; database reachability does not prove a worker heartbeat. Operator-only encrypted backup and a local SQL restore drill are documented in [Backup and recovery](docs/BACKUP-AND-RECOVERY.md); Auth passwords, project configuration and the root encryption key need separate recovery. History archival remains a proposed coordinated migration, not an implemented storage cutover. Live integrations and independent release review are tracked separately from local checks.

Workflow editing keeps one current card per channel with Created and Updated timestamps. Draft changes save in place. Editing active instructions creates a pending internal revision until reviewed and activated; earlier revisions stay in collapsed Revision history. No archive/deletion behavior was added.
