# Automatic textual review

With founder-adopted two-step policy and automatic review enabled, approving the exact copy also prepares a canonical review request. The maintenance worker recovers preparation if the initial response or setup was interrupted. No review is scheduled for legacy policy or before human copy approval.

The request uses the exact saved wording and the active channel's supplied reference context. It does not imply web access or visual inspection. The existing package authorization, actor permissions, validated review connection, qualified rates, and global/connection/package caps all apply. No extra cost-confirmation click is required within that authorization. Missing setup or exhausted budget is retained as an actionable message; copy approval remains saved.

One new review may be queued per maintenance pass. Each accepted copy has one automatic attempt; failed, incomplete or uncertain attempts are retained rather than automatically retried. An explicit textual-review request can be used after inspecting and resolving a known outcome. Unknown outcomes and active review work must be resolved first. Budget consumption never resets for a new acceptance or retry.

Dispatch rechecks current access and copy identity before sending a provider request. Stale results cannot become a report for current copy. Only a complete valid report citing supplied references attaches. When automatic review is enabled, final approval waits for that report and any blocking findings to be resolved. A second pass from the same provider is labeled accordingly and never treated as independent. Policies requiring independence, including Notes, need known writing provenance and a qualified different-provider reviewer; unavailable independence blocks before spending.

Final package approval and publishing remain human actions. Actual images, video, audio and slides still require human final inspection; textual reviewer output is not a visual check.

Status appears in the review dialog with polling and a manual refresh control. Demo does not run or simulate provider reviews. Browser QA injects a clearly simulated report only in an isolated test fixture.

Verification: orchestration domain tests cover queue idempotence, package caps, missing configuration, unknown/failed results, revoked authority, changed copy, required independence, and old-package/new-acceptance behavior. Browser checks cover pending review blocking final approval and an exact simulated report enabling the final human decision. No paid provider test or live policy adoption was performed. Policy adoption remains gated pending first-Founder setup and overall release verification.
