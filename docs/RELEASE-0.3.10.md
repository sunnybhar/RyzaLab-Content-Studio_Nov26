# v0.3.10 — LinkedIn and Newsletter sample workflow

AI & budgets prepares a single pack of three sequential AI idea/content samples (LinkedIn checklist, LinkedIn explainer, then Newsletter adaptation of the first LinkedIn draft) and two blank manual exercises (LinkedIn idea/write and labelled Reddit-template-to-Newsletter adaptation). A previously completed one-case v0.3.9 run offers **Continue remaining four samples**, retaining its original job IDs and evidence. It does not pay to regenerate the first sample.

Manual samples must be written by a user. Templates and local tests are not completed manual acceptance. Read content and sources, resolve highlighted required inputs, submit for copy review, approve the current copy, inspect the textual review if configured, approve the final package, then use the calendar/manual publication handoff. Nothing is approved or published automatically.

Authorized queued text/idea/review jobs belonging to the signed-in user can now progress while Studio is open. Server execution still uses the existing worker token, lease, frozen-context and budget checks. Other users' jobs and failed/uncertain outcomes are not automatically dispatched/retried. The deployment must configure STUDIO_ALLOW_PROVIDER_EXECUTION and STUDIO_WORKER_TOKEN. Errors stop UI resubmission until an explicit recheck of the queued request.

Setup includes an optional, explicit checkbox to use the selected stored Claude connection for LinkedIn/Newsletter ideas/writing/review. This replaces only those chosen mappings; other workflow references, rules and founder budgets are preserved. Without the checkbox, existing channel overrides remain.

Detailed usage/cost reporting is intentionally deferred to v0.3.11. Actual live samples remain unverified by the coding agent; production network/model access cannot be inferred from local fixtures.
