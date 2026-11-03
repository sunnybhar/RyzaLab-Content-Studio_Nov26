# v0.3.26 — approved Ideas workspace

Implemented the approved combination: requests stay in the left inbox; selecting one shows its original topic, request number, date and channel, with its ideas on a New ideas / Shortlisted / Ready to write board. Table view displays the same ideas and saved stages; the selected view persists on this device.

Shortlist or move an idea using its card button, or change its stage in Table view. These are persisted planning changes, not editorial approval or a paid AI request. Channel edit permission is required. Stale moves and moving rejected ideas directly into writing are rejected. Existing approved ideas default to Ready to write; existing pending ideas default to New ideas. Rejected feedback remains available separately, with existing revise/copy actions.

Manual ideas and historical requests remain accessible. Incomplete/queued/blocked batches show generation actions within the selected request; full successful batches collapse those details. No raw provider response is exposed in the normal Ideas view. Source links, research, original idea details, linked drafts and newsletter actions remain in the idea dialog. Opening a linked draft does not duplicate it.

Validation: 268 domain tests, production build/typecheck, full browser workflow, focused persistence/board/table/source/draft/mobile browser, automatic-writing browser, composer recovery/newsletter browser and workspace-cleanup browser all passed. No live provider requests or publication were run.

DEPLOYMENT BLOCKED: GitHub's GH_TOKEN is invalid; gh has no saved fallback credentials and no GitHub connector is available. Local release commits are preserved on studio-rebuild; main/production have not been updated. Reconnect repository authentication before pushing studio-rebuild and the verified release to main. Do not report v0.3.26 as live before that succeeds.

Update: Git write access was restored after reconnection. Both working branch and main were successfully pushed and remote-verified at release93ce866. The deployment blocker above is historical; hosted rollout still needs confirmation.
