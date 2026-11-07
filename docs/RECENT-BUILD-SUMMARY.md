# Recent build cycle — v0.3.29 through v0.3.36

Requested complete change list. Releases through v0.3.35 were pushed; v0.3.36 passed339 domain tests, production build and browser/export checks and is being released. Hosted rollout is separate from a successful Git push. Work stops after v0.3.36 at the user’s request.

Remaining scope: full investigative research/claim ledger/data analysis; complete template conversion and selection; tighter cost estimates; LinkedIn integration; approved scheduled publishing; production reliability and live provider/quality acceptance. Actual Ryan Humanizer file and configured provider credentials are still external dependencies. No paid provider requests, operational imports or social publications were made during these development checks. IB-12 remains withdrawn.

The following chronological release records describe what each increment added; later increments supersede earlier “pending” notes. The current consolidated tracker is CONSOLIDATED-EXECUTION.md.

# v0.3.29 — first consolidated-backlog increment

This is an incremental release, not completion of the18unfinished backlog items. The full scope remains in CONSOLIDATED-EXECUTION.md.

- IB-18 core: atomic per-draft save receipts, pure-save timeout reconciliation, one safe CAS-contention retry, local working-copy recovery (72hours, account/workspace/draft scope; cleared on sign-out), preservation of typing during saving, explicit conflict comparison/merge, working-copy download and truthful unknown/failed/saved status. Client state cannot regress to an older workspace response. Production database latency still requires measurement/live acceptance; this release does not assert the reported root cause was established.
- IB-19: one pending submission, navigate to Create only after confirmed success, clear Under review confirmation/Reviews action; failures retain editor.
- IB-11: shared section spacing and Calendar/import/pipeline padding across responsive layouts.
- IB-17 core: imported briefs and source concepts remain available across active channels; target-specific derivatives preserve original provenance and are keyed by channel/account/format. Writers can draft from their own pending idea without fabricating its approval. Evidence access remains checked against source permissions.
- IB-13 wording/breakdown: Approve up to maximum, separate actual/reserved amounts and saved rate breakdown. No budget caps/authorization behavior loosened; tighter estimate and confirmation evaluation remain pending.
- IB-16 core: Blog format, Write as selector, visible estimated reading time, distinct Blog800–2000word and Newsletter1600–3000word contracts at200words/minute, readable citations and existing image-optional long-form downloads. Template/multi-source/image-provider enhancements remain separate dependencies.
- IB-21 history: latest10confirmed publications, separate approval-only records, all-channel month ranges and immutable package popups. Processing failures are displayed separately from editorial findings. AI preparation/correction-loop integration remains pending under IB-20.

Validation:293domain tests pass; production build/typecheck passes. Full app, calendar/pipeline, automatic writing and submission success/failure browser tests pass against the production build. Dedicated local browser checks pass saved-outcome recovery, edit-during-save, conflict merge, immutable history previews/month filters and existing review override. No live paid AI, operational import or publication was run. No migration required for these additive workspace fields.

Manual test: save existing work, refresh after footer0.3.29, edit/save/reopen a draft; choose another channel in Existing Pipeline; try Blog selection and explicitly save; submit a valid draft and confirm return to Create; open Reviews and preview historical packages/date filters. A genuine live database delay cannot be reproduced by claiming a fixture test is a production incident diagnosis.


# v0.3.30 — research retrieval and writing resources increment

This release builds on v0.3.29. It does not complete the consolidated backlog.

- New public research excludes Wikipedia and known mirrors; historical records remain readable. Discovery prioritizes configured sectors, preferred/excluded domains and depth, filters generic account/store pages, and expands to independent reporting.
- Accessible public HTTPS pages are read within bounded size, deadlines and redirects. DNS addresses are checked and pinned to prevent private-network retrieval. Unsupported/unavailable pages retain clearly labelled discovery excerpts. YouTube descriptions are labelled descriptions, never watched-video or transcript evidence.
- Source cards show access limitations and available authors. New writing/idea evidence excludes Wikipedia citations.
- Agent Rules adds Humanizer, Research Instructions, Source Preferences, newsletter structure and export layout uploads/edits, original downloads and three prior versions. Humanizer/long-form writing resources apply to applicable new snapshots. Structured Source Preferences drive discovery. Freeform Research Instructions are stored for the subsequent research-planner integration; this release does not claim the complete research pipeline consumes them.
- Supported JSON export layouts control font, size, page, margins, spacing and headers/footers for long-form PDF/DOCX. PDF/DOCX reference uploads do not automatically reproduce arbitrary visual layouts.

Validation: 297 domain tests, TypeScript and production build passed. Focused research evidence selection/source links and resource editing/version retention browser tests passed using local fixtures. Production app smoke verification recorded separately in WORK-IN-PROGRESS.md. No paid AI calls, operational calendar import or publication occurred. No new database migration required.

Still pending: complete deep investigation/claim ledger, full research-instructions planning, multi-source newsletters, OpenAI image workflow, automatic correction/re-review, LinkedIn integration and scheduled publishing. Actual Ryan Humanizer document and provider credentials remain external dependencies.

Check after rollout: footer v0.3.30; Agent Rules resource sections; configure Source Preferences using supplied JSON; run research and inspect source access labels. Existing saved research remains historical and is not rewritten by the deployment.


# v0.3.31 — optional OpenAI images in the editor

IB-01 increment: Write now offers image generation for posts, Blogs and Newsletters through the existing qualified OpenAI image adapter. One image connection can be mapped to multiple channel workflows. Secure connection setup stays in AI & budgets; no API keys belong in prompts or the repository.

Users provide a brief, consent to one maximum-priced request within package limits, check its status, preview its private saved asset and explicitly apply it as a main image or slide image. Generated outcomes never overwrite content automatically. Unknown outcomes block a second paid image request. Founder image authorization preserves the existing total package cap. A server-side quote above the confirmed image maximum is rejected for fresh consent.

Main images flow into existing previews and optional Blog/Newsletter PDF/DOCX exports. Private downloads authenticate using the existing session. Applying an image verifies completed same-draft ownership, current editing permission and revision, then uses the standard revisioned save and review invalidation. Removing an image is a normal draft edit and must be saved.

Limits: no real OpenAI request was made during development; provider/model/rate/key qualification remains necessary. Image cost stays conservatively reserved until verified reconciliation. Arbitrary section-by-section image placement and multiple image export layouts remain pending, along with the other consolidated backlog items.


# v0.3.32 — multi-source newsletter composer

Create offers **Combine sources into a newsletter**. Select posts and ideas across channels, imported pipeline briefs, pasted text and up to two searchable PDF/DOCX/MD/TXT documents (256 KB each, 512 KB combined). Up to ten sources and 60,000 combined extracted characters are retained. Larger or unreadable documents fail explicitly; no OCR or arbitrary layout reproduction is claimed.

Create a starting outline from the selected titles, edit it, then save and open a blank newsletter. Composing performs no paid AI request. Normal Write controls can explicitly generate against the combined outline, selected source text and channel structure/Humanizer guidance. Qualified model input bounds still apply; reduce oversized source sets when needed. Binary originals are retained for download, not sent to the model.

Source snapshots include captured time, original revision/channel, source text, references and uploaded originals. Later source edits do not silently alter the saved evidence. Permissions are rechecked at selection/generation/dispatch; deleted or inaccessible linked sources block generation and combined source snapshots are hidden from non-admin filtered state. Retry identifiers prevent duplicate drafts for an identical composition and reject changed payload reuse.

Remaining scope includes full investigative research, automatic AI correction/re-review, section image placement/layouts, LinkedIn OAuth and approved scheduled publishing. The consolidated execution list remains authoritative. No paid generation, operational import or publication was performed during development.


# v0.3.33 — bounded editorial correction and re-review

In AI & budgets → Review and preparation, the founder can enable **Automatically correct review findings and recheck**. Existing policies remain off until explicitly enabled; policy changes retain existing cap controls and require current preparation authorization.

Writer submits → canonical AI review → supported corrections → exact-revision recheck → founder final decision. At most two correction rounds are created per submission. Each correction must fit the existing package allowance with room for the calculated recheck; all normal monthly/user/request/package reservation checks remain enforced. No automatic retry of failed, uncertain or invalid correction output.

The original wording stays in revision history. Missing facts retain a candidate and targeted questions instead of replacing existing human copy. Later edits, source/permission changes, disabled automation or an already approved exact package prevent dispatch/replacement. AI never grants final approval or publishes. The immutable final package and manual override controls remain with the founder.

Canonical research/newsletter source IDs are provided to review and checked against the exact frozen prompt, alongside workflow references. Invented IDs remain invalid. Image requests now participate in the same authenticated existing-request progress path; no new request is created by checking status.

Validation uses local provider-result fixtures, not paid provider calls. Live quality/cost/worker acceptance still needs configured models, qualified rates, current allowances and the worker. Deep research, section image layouts and publishing integrations remain separate unfinished backlog items.


# v0.3.34 — direct sources, research methodology and bounded evidence

Web research accepts up to ten explicit public HTTPS article/source links alongside the question. Wikipedia/mirrors, private literal targets, credentials and configured excluded domains are rejected before retrieval. Every redirect is checked and shares one reading deadline. Unreadable supplied links do not become cited evidence. Per-domain, depth, size and aggregate reading bounds remain visible limitations; this is not unrestricted crawling or video watching.

Saved Research Instructions guide evidence analysis in new source-backed idea/writing requests. The baseline asks for original evidence, independent comparisons, counterarguments, contextualized data/denominators, dates, limitations and attributed vendor claims. The exact resource version is frozen in the request and displayed under Agent Rules used. Private file text is not appended to public search queries. Structured Source Preferences still drive discovery. Native Claude public-search requests retain their separate public-only system.

Long research extracts and newsletter source passages fit qualified model input bounds through local, labelled passage selection. Coverage records sources/passages included or omitted; full retained extracts remain saved. Selected newsletter sources remain represented. The task, outline, existing human copy, protected policy and Instructions are not silently shortened. Oversized mandatory context still fails explicitly. No claim is made that omitted passages were read, verified or used by the AI.

Image compatibility fixes: main-image descriptions round-trip through project exports; image controls use the same global/channel mapping as dispatch; unsupported non-GPT-Image models fail before a generation call, and invalid/oversized returned PNGs retain an uncertain outcome without an automatic paid retry.

Validation: 322 domain tests and production build/TypeScript passed. Focused research selection, image consent/attachment and correction-status browsers passed with local fixtures. Production smoke recorded in WORK-IN-PROGRESS.md. No paid provider calls, operational import or publication was made.

Still pending: full deep-investigation dossier/claim ledger and data analysis, complete template/image-section layouts, tighter cost estimates, LinkedIn integration and approved scheduled publishing. Humanizer/provider credential and live quality acceptance remain external dependencies; this release does not complete the full backlog.


# v0.3.35 — section images and illustrated long-form exports

Saved Blogs/Newsletters can attach a completed generated image to a main illustration, slide or selected Markdown section heading. Section figures retain captions, descriptions and image-job provenance. Move, edit or remove them in the editor; save those edits normally. Inserting ordinary paragraphs does not move heading identities; duplicate heading titles use occurrence order. Renaming/removing a heading flags its unplaced figure instead of silently discarding it.

Article preview, founder review and approved-history popup show main/section figures in context. All figure assets are checked for immutable ownership before approval and included in package exports. Caption/description wording participates in factual/revision checks. AI corrections may revise only supplied image captions/descriptions; unknown image IDs are rejected and asset URLs never change through that output.

PDF/DOCX exports embed optional main and section images at their headings, with captions, supported layout settings and actual PDF page count. Exports sit directly below article text. Text-only export remains available; a broken heading placement can be reassigned/removed or images explicitly excluded. Supported JSON layout settings remain distinct from reproducing an arbitrary PDF/DOCX visual template exactly.

Validation uses generated local image fixtures, not paid AI. Domain tests cover heading identity, replacement, removed sections, project roundtrip, immutable ownership and caption correction. Artifact browser checks ordered DOCX images/captions, supported font/header/margins, multipage PDF, text-only export and missing-heading guard. Production build/full-browser results are recorded in WORK-IN-PROGRESS.md.

Still pending: complete template upload/selection/conversion, full investigative research dossier/data analysis, tighter estimates, LinkedIn OAuth and approved scheduled publishing, plus live credential/provider/quality acceptance. This increment is not the complete backlog.


# v0.3.36 — excluded-source reuse and historical review eligibility

New model work filters Wikipedia/known-mirror citations and their dependent claims from historical research, imported workflow source references, idea reference lists and pipeline links. Original records stay unchanged. Native research does not promote a mixed excluded-source block into supported claims. Generated source artifacts that violate the policy are retained rather than silently applied/imported or automatically retried.

Legacy queued supporting evidence is checked before provider disclosure and again at settlement. Public-query research and narration do not disclose or unnecessarily depend on unused workflow references. A human's current prose can still be revised to remove an old citation. No stored publication/package is rewritten.

Historical excluded sources remain readable in labelled archive details, but cannot be selected as current evidence. An existing excluded selection can be removed directly. An old AI review with excluded support does not count as a fresh report or trigger automatic corrections. The explicit fresh-review action uses only allowed selected evidence within current package/permission/budget checks; manual override remains available. Filtered readers see exclusion status without gaining access to private job data.

Reviews may cite only workflow references actually included in the compiled context, plus supplied research/newsletter source IDs. Article metadata extraction preserves apostrophes, spaced attributes and numeric entities.

Approved long-form publication handoff downloads now include main/section images and freeze the supported document layout at approval, so later channel-resource edits do not change that approved layout.

Local validation includes source reuse, provider egress, immutable history, review eligibility, reader privacy and archive/fresh-review browser checks. Final production build/regression/browser results are recorded in WORK-IN-PROGRESS.md. No paid provider request, operational import or publication occurred during development.

The deeper investigative dossier, full template handling, tighter estimates, LinkedIn integration and approved scheduled publishing remain unfinished. This release does not complete the full backlog.


