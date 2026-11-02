# v0.3.11 — Token usage, recorded costs and reservations

This final build adds input/output/cache usage and cost details to AI & budgets activity and the sample dashboard. Create → Post budget shows recorded cost, held reservations and remaining per-post allowance without expanding the main content/editor interface. What’s new retains summaries for all five builds.

For supported uncached ordinary Claude calls, provider usage is priced with the frozen qualified USD rates and rounded up to cents. The recorded usage price is not an invoice. Missing/unsupported usage or unqualified cache prices retain reservations until billing reconciliation. Earlier jobs are not retrospectively assigned token counts or regenerated to obtain them. Human reconciliation is labelled separately.

If reported usage exceeds the quote’s cost/token envelope, its known usage cost is recorded honestly and the job becomes unknown for reconciliation. This stops automatic progression/release rather than concealing a higher actual cost behind the original lower reservation. Existing request, post (maximum $2), function, user and founder-monthly checks stay active.

All real live API/model access and user-written manual acceptance samples remain to be verified in deployed Studio. Local fixtures and successful builds do not prove live paid results.
