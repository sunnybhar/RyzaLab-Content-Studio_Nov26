# Review status and pending work in v0.3.22

A pending or uncertain writing request can prevent final approval before an AI review job has been created. Searching Recent activity only for review may therefore show nothing. The review popup now lists Existing requests for this content with exact kind, state, ID, timestamp, owner, error and saved raw response.

- Waiting for cost confirmation: confirm the saved request's existing allowance, or cancel it if it has not been dispatched. Stale draft/source/access context cannot be confirmed or run from this panel.
- Queued: the original requester can Run saved textual review request using the existing owner-scoped progress endpoint. This can dispatch the already authorized request and consume its allowance; it is not another job or a retry. Undispatched work can be explicitly cancelled.
- Running: refresh and wait. An expired request can be checked via the existing endpoint; the worker marks expired uncertain outcomes without blindly dispatching again.
- Outcome uncertain: no cancellation or automatic retry. A settings manager must check the actual provider outcome and cost, then explicitly select Succeeded/Failed, enter verified USD cost and supporting evidence, and Save verified outcome. No outcome or cost is prefilled. This uses existing audited reconciliation; it does not manufacture output, a report or approval.
- Failed/blocked/provider-finished without report: inspect the error and saved response. Once active/uncertain work is resolved, Request textual review becomes available subject to permissions, pricing and package allowance.

Final package checks are unchanged. A current review report, copy acceptance, required media checks and explicit human final approval are still required. No provider call or reconciliation was performed by the assistant during implementation. Hosted request state cannot be inspected from the screenshot alone.
