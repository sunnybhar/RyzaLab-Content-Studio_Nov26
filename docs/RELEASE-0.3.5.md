# 0.3.5 — Web research linked to ideas and writing

Ideas and Write now have compact Web research controls. Run one explicitly requested public query through the configured Claude server-search adapter, inspect cited findings, and select that retained evidence for idea generation or writing. An idea generated from research carries the evidence into its linked draft and subsequent review. No manual copy into a workflow/reference is required for these selections.

The integration retains original URLs, titles, cited excerpts, retrieval timestamp when available, and finding-to-source links derived from provider citation blocks. These are source provenance, not an assertion that every claim is true. Public search receives only the explicit query; private draft/workflow/reference text is not appended. Source pages are untrusted evidence. Personal experiences still need human confirmation.

Failed, incomplete, uncited, tool-error, unknown or inaccessible results cannot be used as cited evidence. Selected results are frozen into generation jobs and checked at dispatch, settlement and explicit candidate application. An uncertain search cannot silently trigger another paid request. Research inside a draft shares its authorized total package cap with writing/review; idea-screen research uses existing monthly/request/function/channel limits. Actual reservations remain held for reconciliation under existing billing semantics.

AI & budgets now supports research price qualification and a Use as Research default action on validated research connections. Explicit channel overrides win. The price editor requires the existing bounded Claude tool/version, one search and a fixed reservation covering all token/context/tool charges. Neither account model listing nor saving qualification proves live search support. No current prices were guessed; provider docs retrieval was blocked in this build environment.

## Validation

198 automated tests, optimized build, full browser walkthrough, research selection browser, automatic-writing browser and isolated pricing editor browser pass. Five synthetic acceptance samples pass across LinkedIn/Newsletter: three intercepted AI-adapter flows and two manual flows through calendar/handoff. Exact scenarios and the distinction from live acceptance are in ACCEPTANCE-SAMPLES-0.3.5.md.

Live provider/model search qualification, current search pricing and paid acceptance runs remain unperformed. No production state/credentials/budgets/memberships were modified, and no actual publication or paid call was made by this build. Setup is documented in WEB-RESEARCH-SETUP.md.
