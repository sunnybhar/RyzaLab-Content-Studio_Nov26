# v0.3.27 — interrupted writing and saved outcomes

The user's Nov6LinkedIn writing request became unknown after the worker lease expired, leaving an empty editor. This proves no terminal result was attached; it does not identify the exact production interruption or establish that the provider failed/succeeded. No production job or invoice has been edited by this release.

## User flow

Open the affected draft after footer v0.3.27. The writing assistant checks for an encrypted saved outcome without a new AI call; Check saved writing result repeats only that recovery check. Old attempts from before receipts existed may have nothing recoverable.

When no result is available, Start a new writing attempt explicitly authorizes a separate canonical writing call. Earlier unknown outcomes/reservations are retained. Previous spend/reservations plus the new quote must fit the current preparation/monthly/function/user/channel caps and the $2total-per-post maximum. A lower post allowance is not silently raised. Research and optional instructions can be adjusted while an old unknown attempt is stopped. No unknown request is automatically retried.

Earlier explicitly followed-up writing attempts remain financial history but no longer indefinitely block the new copy/current review. A queued/running follow-up prevents parallel new writing. Failed/cancelled/blocked successors do not erase the original uncertainty. Repeated identical authorization keys do not enqueue twice. Recovered earlier results never replace a newer writing attempt or human edits.

## Worker reliability

New dispatches mark receipt capability. After receiving the actual provider response, the worker saves an AES-GCM-encrypted immutable receipt under the private studio-assets bucket, separate from the large workspace CAS. It then settles through a shared idempotent transform. If workspace settlement fails, a subsequent progress/worker check can recover that same response with no provider redispatch.

A same-lease response may settle an unknown request only if it was marked lease-expired and has no reconciled actual cost. Another lease, a human billing reconciliation or edited copy is protected. Actual provider usage settles against the saved qualified rates; ambiguous transport outcomes keep reservations. Already-processed receipts are idempotent, including unknown outcomes, and generic queue processing is not stopped by an older missing receipt.

Worker DB/storage requests have12second transport deadlines; credential decryption occurs before claiming dispatch. Existing route180second and provider90second limits remain. If neither backup nor workspace persistence can be confirmed, the worker reports that honestly. A stored receipt is recovery evidence, not a guarantee that all provider interruptions produced text. No new SQL migration or API key is needed; the existing private storage bucket/encryption key is used.

Validation:276domain tests passed; eight focused recovery/follow-up checks re-passed after the final idempotency adjustment; production build/typecheck passed. Full app, automatic-writing, review-override and focused interrupted-writing browser tests passed. The browser fixture proves an unknown attempt checks storage without AI, explicitly queues one follow-up, retains the original hold, applies returned copy and restores normal revision controls. Tests use local fixtures, not paid live provider calls. Hosted rollout/result generation still needs user confirmation.
