# Review status and pending work in v0.3.22

A pending or uncertain writing request can prevent final approval before an AI review job has been created. Searching Recent activity only for review may therefore show nothing. The review popup now lists Existing requests for this content with exact kind, state, ID, timestamp, owner, error and saved raw response.

- Waiting for cost confirmation: confirm the saved request's existing allowance, or cancel it if it has not been dispatched. Stale draft/source/access context cannot be confirmed or run from this panel.
- Queued: the original requester can Run saved textual review request using the existing owner-scoped progress endpoint. This can dispatch the already authorized request and consume its allowance; it is not another job or a retry. Undispatched work can be explicitly cancelled.
- Running: refresh and wait. An expired request can be checked via the existing endpoint; the worker marks expired uncertain outcomes without blindly dispatching again.
- Outcome uncertain: no cancellation or automatic retry. A settings manager must check the actual provider outcome and cost, then explicitly select Succeeded/Failed, enter verified USD cost and supporting evidence, and Save verified outcome. No outcome or cost is prefilled. This uses existing audited reconciliation; it does not manufacture output, a report or approval.
- Failed/blocked/provider-finished without report: inspect the error and saved response. Once active/uncertain work is resolved, Request textual review becomes available subject to permissions, pricing and package allowance.

Final package checks are unchanged. A current review report, copy acceptance, required media checks and explicit human final approval are still required. No provider call or reconciliation was performed by the assistant during implementation. Hosted request state cannot be inspected from the screenshot alone.

## v0.3.23 — distinguish route timeouts from unknown review outcomes

User logs confirmed the main /api/studio route was terminated at60seconds; its configured maximum is now180seconds, matching worker/progress (verified in the Next build manifest). A separate /worker503 completed after37.86seconds below its3-minute limit, so that entry alone does not establish a worker execution timeout or whether Claude completed the old review.

Database reads previously labelled every error as a missing migration. Missing-schema codes now remain distinct from timeouts, permissions and temporary failures; failed reads never reset or initialize saved state. Worker reads now retain classified database errors and log safe authentication/read/claim/provider/settlement phases. Logs contain trace IDs, phase, elapsed time and status—not request bodies, content or API credentials. A provider-outcome-received phase confirms an in-process response was received but does not substitute for a saved review report.

Concurrent UI refreshes share one in-flight read to prevent overlapping polling queues. Plain-text HTTP timeout responses provide an actionable uncertain-outcome message rather than a JSON parsing failure. No automatic command/provider retry was added, and no old unknown request is marked succeeded/failed or billed from an estimate. Resolving old unknown review work still requires verified provider evidence; HTTP200 from an idle worker is not proof that a specific review completed.
