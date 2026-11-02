# 0.3.6 — Automatic research checks and explained package budgets

Research setup replaces manual Research pricing entry. Select a stored Claude Research connection, a planning category and response size; Check capability & calculate reads the fixed official Models API endpoint and checks model identity, web-search capability and token limits. Missing/unsupported/mismatched metadata blocks setup. No paid search occurs during checks.

The documented Sonnet5.5 rates supplied by the user on Oct30 are recorded with their source/date ($2 input/$10 output per million,1cent/search). These are dated documentation, not prices inferred from the Models API. Other models do not silently inherit those rates.

## Reservation boundary

The basic server-side search tool has no small retrieved-input token ceiling. The former50000-byte field capped the submitted query, not all retrieved context. The new output-envelope-v1 calculation uses the model's full reported input window for each possible continuation bounded by the request's aggregate output-token limit: at most outputTokens+1 model passes. It rounds input+output charges upward to cents and adds one search. It uses basic search only, no dynamic filtering, no requested prompt caching and no automatic pause_turn continuation. This is intentionally a loose planning upper envelope, not an expected invoice or an absolute guarantee against provider pricing changes.

For a1M-token input window and256output tokens, this envelope is$514.02. It DOES NOT mean a routine search should cost that amount. It means native server-search lacks sufficiently tight controls to certify the requested$2 ceiling using the documented interface. The app shows the incompatibility and leaves paid research blocked, rather than substituting a cheap expected estimate or increasing budgets. A tighter fixed-cost retrieval architecture/provider-enforced billing control remains required for useful live research within this cap.

Save rechecks model metadata and workspace/connection versions; it records calculated rates, capability and connection allowance only when existing request/monthly/package caps permit it. It never changes monthly/policy budgets or runs a paid sample. Dispatch rechecks current model support and limits before any messages request. Old guessed Research reservations/queued snapshots fail closed and require recalculation.

## Budget categories

- Short text:$0.50 — writing/review without fresh research.
- Researched text:$1.00 — research/writing/review when actual guarded requests fit.
- Newsletter/carousel TEXT:$1.50 — longer or structured copy and revision room; media providers remain separate.
- Custom:$0.50–$2.00, including$1.60.

Each draft now has a collapsed Post budget selector for choosing a lower named category or custom amount within the founder-approved ceiling; explicit authorization changes only that post. These are suggested total post ceilings, not charges, quality grades or promises of included request counts. Provider/model/input/output/revision choices determine cost. Monthly budget is founder-selected; an unset budget is no longer prefilled as$5. Category/cap changes require explicit saving. The$2 aggregate ceiling is checked across earlier revisions and held unknown reservations at enqueue/confirmation/worker, including legacy content jobs.

207 automated tests, the optimized production build, full browser walkthrough, automatic research-setup UI fixture, founder settings fixture, research evidence flow and per-post50c/custom160c browser checks pass. The new setup endpoint rejects unauthenticated calls (401). Verification is recorded in WORK-IN-PROGRESS. All provider interactions in tests are synthetic/intercepted. No live credentials, state, budgets, roles or paid provider calls were changed or run by the build.
