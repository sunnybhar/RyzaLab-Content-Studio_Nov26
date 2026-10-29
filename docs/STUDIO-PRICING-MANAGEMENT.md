# Studio pricing management

In AI & budgets, an authorized settings manager can load the current pricing registry, add an entry, edit its rates or remove it. The editor currently covers text, ideas and review. Provider access checks remain separate from price and adapter qualification.

Enter prices in USD per million tokens. Studio stores cents per million, reserves a conservative input/output upper bound, and still enforces the existing connection, request, monthly, user and total package allowances. Optional fixed reservation amounts must cover the full operation. Saving does not execute a sample or spend funds.

Each entry needs its exact provider/model/function, input/output limits, HTTPS source, verification date and evidence describing the human qualification. Studio records the author and a server-generated registry version. This is a recorded human qualification, not automatic verification of the provider's current prices.

Existing server environment entries remain the source until the first registry change. That first change copies inherited entries into the workspace registry. Later changes use the workspace registry exclusively, so removing a price cannot silently fall back to the environment. Concurrent changes require reloading rather than overwriting another editor.

A queued job keeps its original pricing snapshot. The worker compares it with the current entry before provider dispatch. An edited or removed entry blocks affected jobs; it does not silently recalculate a larger reservation or retry a paid request. Unchanged entries remain usable. In-flight/unknown outcomes retain their original accounting and reconciliation rules.

Research, image, audio and video evaluation remain separate. No model is qualified merely because a provider lists it. Demo mode offers no price-qualification or paid execution path.

Validation for this batch: 155 automated tests, TypeScript, production build, and an isolated browser test of add/edit/remove, dollar conversion and stale-version payloads. The local browser harness uses simulated request responses, while domain tests check permissions and version/snapshot enforcement. No credentialed provider or live workspace write was performed.
