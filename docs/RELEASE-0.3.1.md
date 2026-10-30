# Studio 0.3.1 — idea batch count

The user confirmed Quantity4 returned one visible idea. Source review found the request count was sent, but the authoritative output contract did not require it and the importer accepted any valid1–20-card array. The actual live provider response was not retrieved during this investigation, so token-limit/provider behavior for that specific run is not asserted.

Changes:
- The authoritative ideas contract explicitly requests the exact quantity, concise distinct cards and no combined content pack. Workflow posting cadence does not replace the requested count.
- Worker settlement and saved-result recovery validate the expected count from the canonical JSON request. Incomplete provider termination, malformed output or too few/many cards are retained with actionable errors, not imported as a successful batch. No automatic paid retry is made.
- Existing imported cards remain untouched. Where a saved request count differs from the imported count, status shows the mismatch rather than declaring a complete batch.
- Recurring request metadata includes its quantity. New ideas quotes use a changed contract version; an older queued quote blocks before dispatch instead of silently changing a previously priced request. Existing completed results and billing evidence remain intact.
- Quantity help clarifies that the field controls the count. Approve idea now explains its location in Ideas→Approved and the separate Use idea/Open linked draft action for Create.

Validation:172 automated tests, TypeScript, production build and isolated count-status browser check pass. Full browser release evidence is recorded in WORK-IN-PROGRESS. Tests make no paid provider call. Saved live output, budget changes, idea removal and paid regeneration were not performed. Web-search integration is not part of this patch.
