# RyzaLab Editorial Desk: Governance

**Risk-triggered, not stage-triggered.** Agents own reversible editorial work. Ryan may approve any
Note for publication; Sunny and LeAnn may approve a Note they did not author. The release approver decides whether
a piece deserves release, not whether routine research or QA was done correctly
([SPEC: Outcome](SPEC.md#outcome)), and each Note has one planned release HITL (SPEC, Purpose line).

Company governance (risk tiers, identity, evidence roles, authorization) is pinned from
`ryzalab-platform` (`governance/agent_control_plane_policy.json`). This file maps editorial work
onto it and gives way to it wherever they overlap. Within editorial policy, precedence is
Ryan's latest instruction, then SPEC, then PLAN, then the current canonical RyzaLab
brand/offer/release sources, then repo release rules ([SPEC: Control plane](SPEC.md#control-plane)).

## Tiers

The three tiers are the platform's, with editorial examples. LeAnn is the content manager, who
drafts and posts under the conditions in this file.

| Platform tier | Editorial work | Who proceeds | Gate |
|---|---|---|---|
| `draft`: no runtime or external effect | Research, sourcing, countercase, claim ledgers, drafts, narrowing a claim, voice edits that keep facts, unposted derivatives, calendar planning | Sunny, LeAnn and agents, no check-in | Machine checks first ([SPEC: Deterministic floor](SPEC.md#deterministic-floor)), then the editorial precheck |
| `confirm`: reversible change to the desk's own machinery | Edits to `policy/`, templates, the voice guide, the Notion calendar schema, the Grok assistant's rules | Sunny or an agent proposes by PR | One review by someone other than the author; Ryan merges |
| `blocked`: public, or not cheaply reversible | Publishing a Note | Ryan, or Sunny or LeAnn (not the author) | `APPROVE RELEASE` ([SPEC: Control plane](SPEC.md#control-plane)), after the readiness gates below |

By founder decision on 2026-10-22, Ryan, Sunny or LeAnn may give `APPROVE RELEASE` for a Note.
Ryan may approve any Note, including his own; Sunny or LeAnn must not be the Note's author. Ryan remains the website owner and renders and merges
the approved Note into `ryzalab-website` unless Ryan grants website access; that mechanical step is
not a second approval. Ryan may withdraw this authority at any time.

By founder decision on 2026-10-23, Sunny and LeAnn get write access to this repo (Sunny holds it
now; LeAnn will once she has a GitHub account). With it, either may act as a maintainer for a
Note submitted through GitHub ([README: Path 2](../README.md#path-2-a-team-member-submits-a-note-through-github)):
run the readiness review (`scripts/standards_review.py <content_id> all`), copy an
`APPROVE RELEASE` comment into the piece's `STATE.yaml`, and merge a `draft`-tier PR through
`scripts/merge_pr.sh`. Acting as maintainer grants no approval: release approval stays as above,
neither may approve a Note she wrote, and `confirm`-tier merges and the website stay with Ryan.

> **Deprecated 2026-10-22 by Ryan:** the non-author rule as it applied to Ryan. As first written
> the same day, it read "the approver must not be the Note's author" for all three approvers, so
> Ryan could not approve a Note he wrote. It still applies to Sunny and LeAnn.

Note publication is `blocked` because it is not cheaply reversible: a published page can be
cached, indexed or screenshotted after it is taken down.

### Posting

By founder decision on 2026-10-22, Sunny, LeAnn or Ryan may post on LinkedIn, Reddit, Facebook or
Kit without Ryan's approval. This permission applies only to new posts: a post is not re-posted under
this permission, and every new post gets its own `distribution_id`. The no-repost rule does not
cover Ryan's plain repost of a Company Page post from his personal profile, which is allowed and
expected and keeps the Company Page post's `distribution_id` (founder decision 2026-10-23). Posting is allowed only when all of
these conditions hold:

1. The Note is already live at its canonical URL, and the `canonical_url` in `note.yaml` has been
   verified on the live site.
2. The post makes no factual claim that the Note does not make
   ([EDITORIAL_LOOP: 10. LinkedIn](EDITORIAL_LOOP.md#10-linkedin) for LinkedIn; the same rule
   applies on every channel).
3. `scripts/distribution_link.py` generated the `distribution_id` (and, for a post with a link,
   the tagged destination); neither was typed by hand
   ([STANDARD: Distribution identity](media/STANDARD.md#distribution-identity)). A post with a
   link carries only `ryzalab.com/n/<code>`, and before posting that link answers 302 to the
   exact tagged URL ([README: workflow
   step 9](../README.md#current-workflow-verified-2026-10-22-americanew_york)). For LinkedIn,
   `scripts/linkedin_check.py` also passes on the post. Reddit, Facebook and Kit posts follow
   their channel rows in [media/TEST_PLAN.md](media/TEST_PLAN.md) (T11 to T13).
4. The post contains no customer data, customer anecdote or security weakness without Ryan. The
   existing [early-escalation rules](#what-escalates-early) still apply.
5. After posting, the poster records the post URL on the **Distributions** row and in
   `content/<content_id>/distribution.yaml`, then sets that row to `PUBLISHED`.
6. Ryan may take down any post or withdraw this permission at any time.

## How a PR merges

Every PR to this repo goes through the platform's five-step loop, defined in the platform's
Finding Disposition Standard (`docs/standards/FINDING_DISPOSITION_STANDARD.md`, mirrored under
`docs/UPSTREAM/`) and enforced by the vendored merge gate (`scripts/qa_merge_gate.py`, with
this repo's profile in `governance/agent_control_plane_policy.json`).

1. **Challenge.** An independent review, from a different model family than the author's.
2. **Disposition.** Every finding is fixed; refuted, for Codex findings only and with evidence;
   or backlogged as an issue, for non-blocking findings only.
3. **Update.** Fixes land as new commits on the PR.
4. **Validate.** The `content-checks` CI job passes and the review is re-run on the exact head.
5. **Merge.** Only through `scripts/merge_pr.sh`. It dispatches the `QA Merge Gate` workflow and
   refuses unless that run publishes a PASS at the pinned head.

The review-convergence rules apply: P0/P1 findings are fixed in the PR, P2/P3 findings are
backlogged, and after two review rounds in a row with only non-blocking findings, stop
requesting reviews.

## What must be true before release approval

From [SPEC: Evidence standard](SPEC.md#evidence-standard) and
[SPEC: TEST / ASSURE](SPEC.md#test--assure). The editorial scorecard is not one of them: it is
optional and informational (amended 2026-10-23 by Ryan; see
[Blog-level controls](#blog-level-controls)).

- no unresolved fact: no `NEEDS_SOURCE` row, no `CUT` wording still in the text, and no
  unresolved legacy `RED_*` claim. Nothing unresolved releases, whoever approves;
- publication readiness is `PUBLISH`, or `PUBLISH_FOUNDER_ACCEPTED` under
  [founder acceptance of a wording finding](#founder-acceptance-of-a-wording-finding).
  Founder acceptance never clears either of the
  [two general controls](#two-general-controls-every-note-follows): no misinformation (a failed
  fact check or an unresolved `RED_*` claim) and no misrepresentation of a brand or public person
  (a finding tagged `[CLASS: MISREPRESENTATION]`);
- the RyzaLab offer and claim boundary passes, with the CTA checked against [offer.md](offer.md);
- the two general controls hold (no misinformation, and no misrepresentation of a named company,
  brand, product or public person), and no known material legal issue remains. A privacy-harm or
  safety finding Ryan accepts is his recorded judgment that it is not material;
- the exact candidate is pinned and unchanged since assurance.

> **Amended 2026-10-23 by Ryan:** the readiness condition read "publication readiness is
> `PUBLISH`". It now also accepts `PUBLISH_FOUNDER_ACCEPTED`, below. The other four conditions are
> unchanged.
>
> **Amended 2026-10-23 by Ryan (second change):** the issue condition read "no known material
> legal, privacy or customer issue". It now names the two general controls and a material legal
> issue. Customer is dropped because this repo holds no customer content, and a privacy-harm or
> safety finding Ryan accepts is not a known material issue.

### Blog-level controls

By founder decision on 2026-10-23, three controls moved from newsroom level to blog level, and a
humanizer check is part of them:

1. **The claim ledger is a short facts list.** Only external facts get a row (numbers, prices,
   dates, quotes, what a named company or person said, offers or charges), each `VERIFIED`,
   `NEEDS_SOURCE` or `CUT` ([SPEC: Evidence standard](SPEC.md#evidence-standard)). Older ledgers
   still read, so old Notes do not fail.
2. **Readiness is one accuracy check by one independent model.** Only a factual error (an external fact that is wrong, unsupported, misquoted, misattributed or stated more strongly than its evidence), a misrepresentation of a named company, brand, product or public person (`[CLASS: MISREPRESENTATION]`), a safety hazard, a broken offer or CTA, or a broken constraint block, as P0 or P1.
   Tone, framing, word choice, a strongly worded opinion and style are P3 suggestions.
3. **The scorecard is optional and informational.** It runs on request and gates nothing.
4. **Humanizer.** `scripts/precheck.py` prints the AI-writing scanner's top findings grouped by
   type; they never block and need no written disposition. The readiness reviewer lists up to
   three AI-writing-style patterns as P3 suggestions. The mechanical precheck FAILs (em dashes,
   mojibake and the like) still block.

> **Amended 2026-10-23 by Ryan:** before this, every material claim had a ledger row in six
> states, P0/P1 also covered overclaim and broken promises, a scorecard `PUBLISH` was expected
> before release, and every scanner finding needed a written `fix` or `keep`.

### Two general controls every Note follows

Every Note follows these two controls, whoever writes, reviews or approves it, and founder
acceptance never clears either:

1. **No misinformation.** No claim may be wrong, contradicted by its source, misquoted or
   misattributed, and no factual claim may lack supporting evidence. The readiness CLAIM CHECK
   marks such a claim `FAIL`. A claim the ledger records as `OPINION` or `FIRST_PERSON` is judged
   only for framing: it is `OK` or `OVERSTATED`, and `FAIL` only when a source contradicts it.
   An unresolved `RED_*` claim is also misinformation until it is resolved.
2. **No misrepresentation of a brand or public person.** The text may not misstate or unfairly
   characterize a named company, brand, product or public person: their prices, features,
   statements, quotes or positions. The readiness reviewer tags such a finding
   `[CLASS: MISREPRESENTATION]`, the only tag. Audience words such as "homeowner", "renter" or
   "buyer" are not named parties.

Advice that could harm someone's privacy is a P1 safety finding, like any other how-to hazard:
founder acceptance can clear it, and Ryan decides. A customer anecdote escalates under
[What escalates early](#what-escalates-early); this repo holds no customer content.

> **Amended 2026-10-23 by Ryan:** the never-clears classes were a failed fact check, an
> unresolved `RED_*` claim, and a finding about a legal, privacy or customer issue, tagged
> `[CLASS: LEGAL]`, `[CLASS: PRIVACY]` or `[CLASS: CUSTOMER]`. They are now the two general
> controls above. Any other `[CLASS: ...]` tag, the retired three included, fails closed as
> malformed. Why: on the home-brand Note an `OPINION` row with no sources was marked `FAIL` for
> "no supporting evidence", and "every homeowner" was tagged `CUSTOMER`; neither was a defect
> any acceptance could clear.

### Founder acceptance of a wording finding

By founder decision on 2026-10-23, Ryan's recorded acceptance can clear a readiness finding about
wording. It applies to a finding only when both of these hold:

1. every claim the line names is `VERIFIED` in `CLAIM_LEDGER.csv`, or in a legacy state that
   reads as verified or as the author's own voice (`GREEN`, `YELLOW_SOFTEN`, `OPINION`,
   `FIRST_PERSON`) (as first approved the same day, only `GREEN` or `OPINION`; widened by Ryan,
   2026-10-23, and `VERIFIED` added with the facts list);
2. Ryan has recorded an acceptance naming that finding id, in the piece's `CONSTRAINTS.md`, in
   exactly this form (`scripts/record_line.py <content_id> CONSTRAINTS.md` refuses any other):

```text
FOUNDER DECISION: RYAN, <YYYY-MM-DD>; CONTENT_ID=<content_id>; ACCEPT_WORDING=<finding id>; REVIEW=<readiness record file name>; CLAIMS=<claim id>[,<claim id>...]; REASON="<reason>"
```

`REVIEW` is the file name of the readiness record under `content/<content_id>/reviews/`, so an
acceptance never carries over to a later review whose finding ids may mean something else.
`CLAIMS` lists the ledger claims in the flagged passage. Only Ryan can accept; Sunny and LeAnn
cannot.

**An acceptance quotes the sentence (founder decision D7, 2026-10-26).** Ryan: "yes, but treat it
as a data-labeling fix, not a model fix." A finding id points into a review the next reviewer
cannot see, so an acceptance that names only the id leaves the accepted wording unrecorded. From
2026-10-26 every acceptance records the accepted sentence or heading itself, exactly as it
stands in `FINAL.md`: the `REASON` of an `ACCEPT_WORDING` line holds it between curly quotes
(“...”), and `scripts/record_line.py` refuses a new `ACCEPT_WORDING` line that does not
quote four or more words, or quotes words that are not in the piece's `FINAL.md`. A decision
recorded in any other `FOUNDER DECISION` line (for example "accepted as written in the original")
quotes the sentence the same way. Acceptances already on file are not rewritten; where one names
only a finding id, add a second line that quotes the sentence and cites the original acceptance,
as the home-brand Note's `CONSTRAINTS.md` does for r2 F3 and F5.

Founder acceptance never clears either
[general control](#two-general-controls-every-note-follows): a failed fact check or an unresolved
`RED_*` claim, or a finding tagged `[CLASS: MISREPRESENTATION]`.

`python3 scripts/standards_review.py <content_id> release-check` decides the readiness condition
and records it in `STATE.yaml` as `release_readiness`. It gives `PUBLISH` when the latest
readiness review on the exact candidate says `PUBLISH` and that review's CLAIM CHECK and
CONSTRAINT CHECK are complete with no `FAIL`, no open finding of any severity is tagged
`[CLASS: MISREPRESENTATION]`, no tag is malformed or retired, and the ledger has no unresolved
fact (amended 2026-10-23: a direct `PUBLISH` answers to the general controls and the facts list
too). It gives `PUBLISH_FOUNDER_ACCEPTED` when
that review says `HOLD` or `REPAIR`, its input bundle is unchanged, every open P0/P1 finding in it
has a matching acceptance line, every claim those lines name is in one of those states, the
review's CLAIM CHECK reports no claim as `FAIL`, the ledger has no unresolved fact,
and no open finding carries the reviewer's tag `[CLASS: MISREPRESENTATION]`. A CLAIM CHECK
`FAIL` blocks whatever the claim's ledger state, so the prompt's framing-only rule for `OPINION`
and `FIRST_PERSON` claims is the reviewer's to apply. A failed fact check is a named claim that is `RED_*`, marked failed or in an
unknown state, or any claim the CLAIM CHECK marks `FAIL`; the readiness prompts define the
CLAIM CHECK words (`OK`, `OVERSTATED`, `FAIL`, one line per ledger claim) and the finding format
(ID, then exactly one severity). A `CUT` (or legacy `RED_REMOVE`) row is resolved only when its
`proposed_claim` quotes the removed wording (two or more words) and that wording is absent from
`FINAL.md`; one with nothing quoted, a `NEEDS_SOURCE` row, and any other `RED` state, is
unresolved. A header-only ledger (no external facts) passes, with a CLAIM CHECK of `none`. A malformed tag,
CLAIM CHECK line or finding (no id, no single severity, a duplicate id) fails the check, and
anything else it cannot read fails closed as `NOT_READY`. `PUBLISH_FOUNDER_ACCEPTED` is never
relabelled `PUBLISH`, and the review's own verdict stays as the reviewer wrote it. Acceptance
lines are left out of the reviewer's prompt and its input bundle, so recording one after a review
does not invalidate that review, and the reviewer judges without them.

The readiness review also receives the Note's `byline` and `author` from `note.yaml`, marked as
page metadata, so a byline is checked against metadata rather than reported missing from the
body.

A change to a published Note's substance carries a dated correction note and sets
`dateModified`, per [SPEC: Corrections and updates](SPEC.md#corrections-and-updates) (added
2026-10-23 by Ryan).

The release packet carries what [SPEC: Release and integration](SPEC.md#release-and-integration)
lists. A LinkedIn derivative that is ready but not yet posted is `READY_FOR_LINKEDIN_PUBLISH`;
Sunny, LeAnn or Ryan posts it once the [posting conditions](#posting) hold.

## Bounded autonomy inside `draft`

The desk gets **one** bounded material assurance repair cycle. It may also make at most one craft
refinement if the editorial precheck misses its threshold. A craft refinement edits wording
within sentences only: it may not add, restore or alter a claim, reorder or restructure, and it is
not a repair cycle. It gets the same scoped re-check as a post-cycle change and is listed in the
release packet ([SPEC: Lifecycle](SPEC.md#lifecycle)). Prefer repairing in this order: source, narrow, qualify, remove, restructure ([SPEC: TEST / ASSURE](SPEC.md#test--assure)).
A claim still unsupported after that cycle is removed or narrowed, or the piece holds with the
blocker named. That is a rule the desk runs itself, not a check-in, and it is not a second cycle.

After the cycle, the only change the desk may make to a claim without asking is to remove or
narrow it: no new claim, no new sentence of substance, no restructuring. The one craft refinement
above is the only other permitted edit, and it cannot touch a claim. The Standards reviewer re-checks just that diff on
the new candidate, and the release packet lists each post-cycle change. Anything beyond removing
or narrowing goes to Ryan, and so does a reviewer's request for Ryan's sign-off on further changes
(founder decision 2026-10-16, recorded on #14).

## What escalates early

SPEC escalates before the release HITL only for irreducible truth, legal, privacy, customer or
authorization issues ([SPEC: Control plane](SPEC.md#control-plane)). Ryan's 2026-10-02
instruction, which takes precedence, adds that the last two items below always go to Ryan, even
when the desk believes the risk is resolved. In editorial terms:

- **A claim that a named company is doing something improper.** It can only release once its
  evidence resolves it to `GREEN`, `FIRST_PERSON`, clearly framed `OPINION`, or `YELLOW_SOFTEN`
  with the narrowing already in the candidate. Escalate early
  when it cannot be resolved and the piece depends on it; Ryan decides whether to keep reporting,
  cut it, or hold. It cannot release unresolved.
- **Making a customer anecdote public** (customer and privacy).
- **Disclosing a security weakness** (legal and customer risk).

A HOLD is only for material truth, legal, privacy, authorization, release, production or
consumer defects, never for polish or wanting another opinion
([SPEC: Release and integration](SPEC.md#release-and-integration)). An escalation that turns out
to be `draft` work is a defect in this file, and gets fixed here.

## Accepted risks

Both accepted by Ryan in the 2026-10-02 working session that set up this repo.

- **Personal AI tools.** RyzaLab has no company-managed AI tools, so team members use their own.
  Residual risk: anything pasted into them leaves RyzaLab's control. The limit for every tool,
  without exception: no customer data, no credentials, no confidential material, whether or not
  it is marked. Revisit if RyzaLab adopts company-managed tools or a customer contract requires it.
- **Grok calendar assistant.** Sends xAI exactly these fields and no others: for Content rows
  `content_id`, title, type, status and content atom; for Distributions rows `distribution_id`,
  channel, status and scheduled date. The allowlist is enforced in code
  (`ryzalab-automation` `media_calendar/run.py`). The same limit applies: no customer data,
  credentials or confidential material belongs in those fields. The assistant never creates,
  changes or reverses any status, and never publishes.

## History

v0.1 of this file (recovered 2026-10-02, never previously committed) cited section numbers of an
earlier SPEC that no longer has them. Reconciled against the current SPEC on 2026-10-02: the
"two failed attempts" stop-loss became SPEC's one bounded repair cycle, and a named-company claim
on unresolved evidence is now an early escalation rather than something Ryan can release.
