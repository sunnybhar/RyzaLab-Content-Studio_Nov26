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
