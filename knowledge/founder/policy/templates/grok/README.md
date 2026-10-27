# Edie's Grok operating model

Install **Part 2** of [EDITORIAL_LOOP_PROMPT.md](EDITORIAL_LOOP_PROMPT.md) as Edie's complete
prompt. Replace the earlier prompt and start a fresh conversation. Part 1 is the operator's
procedure. Preserve old replies as history; do not translate old approvals into new ones.

Edie leads one run in this order: PREFLIGHT (`bash scripts/preflight.sh`), INTAKE (every
founder decision asked once, before drafting), then G1 through G4. PREFLIGHT and INTAKE come
before the first control record and are not values of its `phase`. The procedure, the one-time
setup Ryan does on his machine, the image lane and the merge steps are in the runbook's
[Edie-led run](../../EDITORIAL_LOOP.md#the-edie-led-run-end-to-end).

Edie prepares one Note, its visual, a LinkedIn derivative and a handoff. The existing G1 through
G4 decisions remain human decisions. Edie cannot publish, post, upload, merge, send messages or
change external records. Her writing score remains advisory.

## One control record

- [CONTROL_TEMPLATE.json](CONTROL_TEMPLATE.json) is the initial pending JSON record. The
  operator supplies the real identity, local file paths and exact hashes. Missing assets remain
  missing, even when their draft prose or image brief appears in a reply.
- [scripts/grok_contract.py](../../../scripts/grok_contract.py) is the executable contract.
  It rejects unknown keys/values, invalid transitions, stale approvals, priced CTAs without
  the exact scoped founder exception, and mismatched Drive routes or receipts.
- Writing diagnostics, evidence gaps and proposed tracking inputs remain outside the control
  record. They cannot create another gate, approval or handoff status.

Save the whole reply unchanged in `content/<content_id>/reviews/` and its JSON block as a new
snapshot. Preserve the previous snapshot, then run:

```bash
# Initial snapshot only.
python3 scripts/grok_contract.py content/<content_id>/reviews/grok_control.json --json
# Each subsequent snapshot.
python3 scripts/grok_contract.py content/<content_id>/reviews/grok_control.json --previous content/<content_id>/reviews/grok_control_previous.json --json
```

Exit `0` means the local contract is valid; `1` means a contract violation; `2` means malformed
or unreadable input or usage. The report distinguishes `SNAPSHOT_ONLY` from
`TRANSITION_CHECKED`. Both have `assurance: LOCAL_CONTRACT_ONLY` and
`publication_authorized: false`. No network request, external write or editorial script is run.
An attestation is an operator's report, not authentication of a person or external event.

No price belongs in a post CTA unless Ryan supplies the scoped `FOUNDER DECISION` retained in
the piece's actual `CONSTRAINTS.md`. Sourced product prices in body copy are allowed under the
normal evidence rules. The checker covers explicit pricing expressions; the existing official
review still judges meaning and supported offer facts.

`FINAL` selects the [Drive handoff folder](../../EDITORIAL_LOOP.md#team-handoff-in-google-drive).
It does not advance G1 or grant publication approval. Missing images or teasers stay visible;
the operator completes transfers of available assets and supplies metadata readback receipts.

This is a repo-specific operating model, so it stays with the existing policy and scripts.
There is no second skill or duplicate workflow to install. Changes to this model follow the
repo's `confirm` tier: independent review and Ryan's merge. After merge, the operator replaces
Edie's installed Part 2 prompt; a merged file alone does not update the Grok Bot.
