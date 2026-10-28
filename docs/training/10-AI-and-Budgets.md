# RyzaLab Training — AI and Budgets — Providers, Models and Cost Controls

Version: 2026-10-28 | Audience: Founder and administrators granted AI-settings access

## Objective
Configure providers by function and control paid requests and retries.

## Before you start
Use live credentials only in the secure settings form or server environment; never in documents.

## Availability
Available in preview. Live operation requires the configured /studio workspace.

## Step-by-step workflow
1. Open AI & budgets. Choose the function: research, ideas, text, review, image, video or audio.
2. Add the supported provider, exact accessible model ID and relevant API key. Different functions can have different connections. A text-only model does not become an image/video generator because it has a key.
3. In preview, keys are discarded and validation is unavailable. In live mode, validate supported model access and qualify sample quality before activation.
4. Configure conservative request allowances and qualified pricing. Missing/unqualified prices keep paid execution blocked.
5. Set monthly/per-request and relevant function/user/channel caps. Choose confirmation thresholds only after sample cost evaluation.
6. Use Edit allowance to change a saved connection budget without creating another connection. Disconnect clears its saved key and retains history; Delete is for unused connections only. Resolve active jobs first. Activate the intended connection mapping in the channel workflow. Creating a connection alone does not switch an active workflow.
7. Review queued jobs and reservations. Confirm an awaiting-confirmation job only after checking scope and estimated cost.
8. If a dispatched outcome is unknown, reconcile it before retrying. Do not automatically rerun a potentially charged request.
9. Compare actual reconciled costs with reservations. Hosting/storage are separate from AI budget caps.

## Expected result
Paid generation stays blocked until provider, pricing, budget and execution requirements are met.

## Practice exercise
Preview an unconfigured generation request and verify it reports the missing setup honestly. Perform paid sample tests only in a separately authorized live test.

## Common problems and boundaries
Invalid model: use an ID your provider account actually exposes. No request allowance/rate card: configure and qualify it; do not invent prices or bypass caps. Full video/audio provider qualification remains pending.

## Completion checklist
- I can locate this section and explain its purpose.
- I completed the practice exercise or marked the live dependency as blocked.
- I recorded actual results in the QA workbook.
- I did not treat preview samples as real agent output or live publication.
