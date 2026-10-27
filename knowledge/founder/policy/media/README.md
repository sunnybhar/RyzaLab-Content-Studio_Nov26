# RyzaLab Media package (v0.2, adopted 2026-10-02)

What we cover, how we report, how the editorial calendar pilot runs, and how we measure it. It
adds to [`policy/SPEC.md`](../SPEC.md), [`SOURCES.md`](../SOURCES.md) and the
[runbook](../EDITORIAL_LOOP.md); where they overlap, those three win. Ryan has publication
authority. Sunny runs the work day to day.

## Read in this order

| When | Read | Why |
|---|---|---|
| First, once | [GOAL](GOAL.md) | What Media is for, the business outcome, and the guardrails |
| While researching or drafting | [MEDIA_SPEC](MEDIA_SPEC.md) and [STANDARD](STANDARD.md) | Scope, content types, sourcing, AI limits, channel rules, distribution IDs |
| Planning the week, calendar, or distribution | [PLAN](PLAN.md) | Cadence (3 LinkedIn posts a week), targets, metrics, decision rules |
| Before handing a piece to Ryan | [TEST_PLAN](TEST_PLAN.md) | The checks a piece and the pilot must pass |
| When something looks wrong | [QA](QA.md) | The known failure modes and how each was handled |

## What v0.2 changed from the v0.1 handoff

- **Cadence:** 3 LinkedIn posts a week (Tuesday, Wednesday, Thursday), 24 over the pilot. Reddit
  moves to Monday.
- **Two-atom cap:** counts newly researched atoms only. Kit reuses the week's atoms and analysis
  already done.
- **Distribution identity:** every post on every channel gets a `distribution_id`, carried as
  `utm_id`, and a post with a link links only to `ryzalab.com/n/<code>` (STANDARD section 8,
  TEST_PLAN T21). This replaces v0.1's rule that kept non-LinkedIn channels identity-free.
- **Calendar:** two linked Notion databases (Content and Distributions) with a Grok assistant
  that checks them and drafts the weekly plan, instead of a shared Google Sheet.
- **Status:** adopted. The child experiment `EXP-GTM-media-calendar-pilot` is registered in
  `ryzalab-platform` `docs/experiments/experiments.jsonl` (pending that repo's PR merge).

## Where it came from

v0.1 arrived as `RZL_MEDIA_EDITORIAL_PACKAGE_v0.1_2026-09-29.zip` and was committed unchanged in
`0a34e86`. [MANIFEST.json](MANIFEST.json) holds the SHA-256 of those v0.1 files, so the original
handoff can always be checked against that commit; the files here have since been edited and no
longer match it. QA.md is the v0.1 review record and is kept as written. Independent
cross-model review of v0.1: 2026-10-02, codex gpt-5.6-sol, `QA-RESULT: PASS`.
