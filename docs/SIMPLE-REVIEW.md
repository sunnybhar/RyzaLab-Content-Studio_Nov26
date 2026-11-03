# Simplified review — v0.3.24

1. In Create, save the content and click **Submit for review**. Submission snapshots the current text/context for automation, not a human acceptance. With automatic review enabled, the server queues one canonical review under the existing qualified rates and founder package/monthly limits. The review screen starts the owner's queued request and refreshes its actual status; the configured worker can also execute it.
2. Open **Reviews → Open review**. Read the content/media, edit if needed, and click **Approve & publish**. There is no separate copy decision, final-package tab, approval checkbox, or manual nine-stage checklist. Changes require a new current-version decision.

When checks are delayed, failed, or contain findings, expand **Override checks and continue**, select **Publish with manual override**, enter a reason, then approve. An authorized reviewer can bypass editorial findings, missing reports, pending/unknown jobs, missing media deliverables and price wording checks. The immutable package records the reviewer, reason and actual bypassed findings. It never fabricates a report, settles an uncertain invoice, releases a reservation, retries an uncertain provider call, or bypasses workspace permissions, current-version/rule checks, private source access, or immutable asset ownership. Founder-only Note release remains founder-only.

Old review drafts use the same single-decision screen. Opening a historical review can prepare its submission under the existing package cap without fabricating an earlier human copy acceptance. Unknown requests are not retried automatically; use an override for editorial release, with their billing evidence retained separately. A lower explicit package allowance remains lower; historical spend and reservations still count.

The approval opens **Ready to publish**, with **Copy approved content**, an Open LinkedIn link for that channel, and PDF/DOCX for newsletters/articles. Images are optional. It no longer opens another scheduling form. This app currently has no direct platform posting connection: approval prepares the exact version; it does not send it or mark it published. Existing Calendar publication confirmation remains available for recording a real live URL.

The prior stage records, copy acceptances, packages and jobs remain audit history. They are not auto-marked as human-passed. No database migration is required for the additional JSON snapshot fields.

Validation is local: domain tests, production build/typecheck and browser fixtures. Hosted deployment, live provider calls and real platform publication are not asserted by these tests.
