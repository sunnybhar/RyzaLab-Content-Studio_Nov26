# Editorial policy

Canonical home of RyzaLab's editorial rules. Change them here, by PR (`confirm` tier: someone
other than the author reviews, Ryan merges; see [GOVERNANCE: Tiers](GOVERNANCE.md#tiers)).

New here? Start with the [README](../README.md#start-here) and its
[workflow diagram](../README.md#current-workflow-verified-2026-10-22-americanew_york). Then:

- **What to do next, step by step (current procedure):** [EDITORIAL_LOOP.md](EDITORIAL_LOOP.md),
  and [media/README.md](media/README.md) for calendar, cadence and distribution.
- **What is allowed (the rules):** [SPEC.md](SPEC.md) for writing and evidence, and
  [GOVERNANCE.md](GOVERNANCE.md) for who decides.
- **Look-ups while working (reference):** the [voice guide](voice/RYZALAB_VOICE.md),
  [offer.md](offer.md), [SOURCES.md](SOURCES.md), [templates/](templates/) and
  [media/STANDARD.md](media/STANDARD.md).
- **Why it is this way (historical rationale):** [media/QA.md](media/QA.md), the "why" sections
  of the runbook, and "Where these came from" below. Read these for context, not as instructions.

| File | Owns |
|---|---|
| [SPEC.md](SPEC.md) | The rules: evidence locks, sourcing, scorecard, length cap, risk tiers, release gates |
| [SOURCES.md](SOURCES.md) | Source preference order and the domains prior runs actually used |
| [EDITORIAL_LOOP.md](EDITORIAL_LOOP.md) | The procedure: stage-by-stage commands and checklists |
| [GOVERNANCE.md](GOVERNANCE.md) | Who proceeds at each risk tier, and the accepted risks |
| [QUALIFICATION.md](QUALIFICATION.md) | How an agent qualifies for a desk role, and when to re-run |
| [agent-scorecard.json](agent-scorecard.json) | Evaluation records (round v1, 2026-08-12, now stale) |
| [templates/](templates/) | Assignment, claim ledger, source map, paper digest, release packet |
| [templates/grok/](templates/grok/README.md) | The Grok Bot prompt that takes a draft through the editorial loop to a recorded LinkedIn post, with four human gates |
| [voice/RYZALAB_VOICE.md](voice/RYZALAB_VOICE.md) | The RyzaLab voice guide |
| [offer.md](offer.md) | The offer and CTA wording a Note may use, captured from the live site |
| [media/](media/README.md) | The RyzaLab Media package (v0.2): scope, cadence, calendar, distribution, measurement |

## What sits above this folder

- **Company governance** (risk tiers, identity, evidence roles, authorization) is pinned from
  `ryzalab-platform`. GOVERNANCE.md maps editorial work onto it and gives way to it.
- **Agent skills** (humanizer, qa-lens and the rest) are pinned from `agent-skills`.

## Where these came from

- `SPEC.md`, `SOURCES.md`, `EDITORIAL_LOOP.md`: moved from `ryzalab-website` at `92205a3` on
  2026-10-02 (`editorial/SPEC.md` blob `44b59ed604a1`, `editorial/SOURCES.md` `91972b144394`,
  `docs/runbooks/EDITORIAL_LOOP.md` `3845335f5cb1`). Earlier history is in that repo's log.
- `GOVERNANCE.md`, `QUALIFICATION.md`, `agent-scorecard.json`: recovered 2026-10-02 from a local
  Codex checkpoint snapshot dated 2026-08-28, the only surviving copy; never previously
  committed. The originals are byte-for-byte in commit `59ec3ba`; later edits are in this log.
- `templates/`, `voice/` and the article trails under `content/`: recovered the same way, in the
  commit after `59ec3ba`.

## Paths these files still name

The files were written inside `ryzalab-website`, and some paths in them still refer to it.

| Path in the text | Where it is now |
|---|---|
| `editorial/articles/<article-id>/` | `content/<content_id>/` here |
| `editorial/templates/`, `templates/` | `policy/templates/` here |
| `RYZALAB_VOICE.md` | `policy/voice/` here |
| `tests/qualification-v1/` | `ryzalab-platform` `artifacts/model_qualification/editorial_desk_v1/` (held out) |
| `editorial/HARNESS_CHALLENGE_LOG.md` | still in `ryzalab-website` |
| `scripts/editorial_precheck.py`, `scripts/validate_publish.sh`, `scripts/qa_merge_gate.py` | `ryzalab-website`; Ryan runs them at promotion |
| `notes/*.html`, `tests/`, `docs/...` | `ryzalab-website` |
