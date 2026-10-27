# RyzaLab Notes Editorial SPEC

**Canonical:** `policy/SPEC.md`
**Purpose:** Durable policy for evidence-led, original, human RyzaLab Notes with one planned release HITL by Ryan (any Note), or by Sunny or LeAnn when they are not the author, per GOVERNANCE.

## Outcome

Publish Notes that are defensible, useful, original enough to justify existing, recognizably RyzaLab, and witty when intended without forcing jokes.

`ryzalab.com/notes` is canonical. Ryan may serve as the release approver for any Note, and Sunny or LeAnn for a Note they did not author. The release approver decides whether the piece deserves release, not whether routine research or QA was done correctly, as [GOVERNANCE](GOVERNANCE.md#tiers) defines.

## Architecture

Use three human-authored layers:

1. `SPEC.md`: durable editorial policy.
2. `articles/<article-id>/PLAN.md`: article thesis, evidence, scope, acceptance.
3. `PROMPT.md`: transient current execution delta; reference SPEC/PLAN rather than copying them.

Use one small `STATE.yaml` per article for mutable lifecycle/provenance. STATE is a snapshot, not a log, with one named exception: `scorecard_log`, below.

Do not create another governance artifact unless these layers cannot represent a real failure.

## Lifecycle

`IMPLEMENT → TEST → ASSURE → [REPAIR → RETEST] → EDITORIAL PRECHECK → RELEASE HITL → MERGE → WIRE → CONSUMER TEST → INTEGRATED`

Rules:

- one bounded material assurance repair cycle; after it the desk may only remove or narrow a claim, as [GOVERNANCE.md](GOVERNANCE.md#bounded-autonomy-inside-draft) sets out;
- at most one post-assurance craft refinement if Ryan asks for one after the optional scorecard; it edits wording within sentences only, may not add, restore or alter a claim, reorder or restructure, and gets the same scoped re-check as a post-cycle change. Any change to a claim after the repair cycle is limited to removing or narrowing it (GOVERNANCE);
- merged is not wired; wired is not integrated until production consumer proof exists.

Use current canonical `/ryzalab-assurance-convergence`. An authorized draft skill version belongs only in the article PLAN.

## Intake and evidence locks

A claim ledger cannot exist before research has been done, so the lock is two points, not
one. Both are recorded in `articles/<article-id>/PLAN.md`.

**Lock 1, at intake, before research:**

| Locked at intake | Content |
|---|---|
| Body-word ceiling | The number, plus the counting convention under Length. |
| The question | The question the piece is asking. A question, not necessarily a finished thesis, so that exploratory pieces are not forced to fake certainty they do not yet have. |
| A/V provenance, first pass | The mechanical half of the trigger rule below. |

**Lock 2, at the evidence gate, before any prose:**

| Locked at the evidence gate | Content |
|---|---|
| Thesis | One sentence, as research actually left it. One thesis, not a candidate set. |
| Claim ledger | The short "facts to check" list ([Evidence standard](#evidence-standard)): every external fact with its state, including any wording pre-registered `CUT` as a guardrail before drafting. |
| A/V provenance, completed | The ledger-driven half of the trigger rule, now that a ledger exists. |

**Prose starts after Lock 2, never before.** This is the actual difference between the two
runs. The clean run adjudicated evidence while no prose existed, so no finding could
invalidate written text. The expensive one adjudicated after prose existed, so every finding
could.

**A/V trigger rule, in two parts matching the two locks.**

- **At Lock 1, mechanical:** does the piece quote or embed recorded speech of a living
  person? Yes fires V1 to V8.
- **At Lock 2, ledger-driven:** does any claim in the ledger have recorded speech as its
  evidence source, or does its wording depend on audio or video content, including tone,
  sequence, speaker identity, edit integrity, or translation? Yes fires V1 to V8 even if
  Lock 1 said no.

The second part is the one that would have caught the real case. "Characterises" was
previously carried in the mechanical test, which does not work: characterizing a position
from a written press release, or naming a podcast as cultural context, fires it for nothing,
while paraphrasing a video without quotation marks, citing an article that itself embeds the
clip, or claiming something about tone, pause, or audience reaction slips past it. Those
belong to the ledger, where the evidence source is written down. A quotation appearing in a
revision where none existed before fires the trigger again.

**Scope of a re-lock.** Changing a Lock 1 constraint after Lock 2 is a re-intake. Changing a
Lock 2 item is a re-gate. Either way, re-open PLAN, re-lock, and treat prose already written
as sunk rather than as something to protect.

**The exploratory case.** A piece may enter as a research question with no thesis at all,
and Lock 1 records the question. Demanding a thesis before research either produces an
under-researched lock or a thesis vague enough to pass while constraining nothing. What is
forbidden is prose before Lock 2, not uncertainty before research.

Why this is a gate rather than advice:

- walls-close ran ASSIGNMENT, then four research lanes, then `CLAIM_LEDGER.csv`, then
  `EVIDENCE_GATE.md` issuing `PASS_EVIDENCE` against a 12 row claim ledger with two claims
  pre-registered `RED_REMOVE` by design, and only then drafted. That order is Lock 1, then
  research, then Lock 2, then prose.
- technological-autonomy adjudicated after prose existed, and its length ceiling moved mid
  run. `CONTENT_ARCHITECTURE.md` records the trigger as "new SPEC length ceiling of
  800-1,000 words", which is what forced the article split.
- In that same run the A/V provenance question surfaced only when the founder challenged
  it, by which time a v1 was already published and a fully tested v2 replacement existed.
  A Lock 1 mechanical test would not reliably have fired at first intake: v1 deliberately
  avoided a direct quote, and the verbatim quotation only appeared in v2.
  `STANDARDS_REPORT_v2.md` records that v1 "deliberately avoided a direct quote precisely
  because it is the stronger claim". What would have caught it is the ledger question, since
  v1's claim rested on the recording either way.

## Control plane

**Policy:** latest founder instruction → SPEC → PLAN → current canonical RyzaLab brand/offer/release sources → repo release rules.

**Execution:** Orchestrator/Managing Editor; Research/Data when needed; Writer/Editor; one independent Standards reviewer; Consumer Tester after release.

**Evidence:** persist only exact hashes/commits, material claim disposition where needed, assurance/readiness verdicts, release decision, merged SHA, production URL, consumer result.

**State:** `articles/<article-id>/STATE.yaml` owns mutable lifecycle. PLAN does not.

**Approval:** The release approver is Ryan (any Note), or Sunny or LeAnn (not the author),
per [GOVERNANCE](GOVERNANCE.md#tiers). The normal HITL is:

`APPROVE RELEASE | REVISE <named dimension(s)> | REJECT/HOLD`

The byline is Ryan unless `APPROVE RELEASE` carries `BYLINE:<name>` ([voice guide](voice/RYZALAB_VOICE.md), house mechanics).
The byline is page metadata in `note.yaml`, not body text; the readiness review receives it from
there (amended 2026-10-23 by Ryan).

Escalate earlier only for irreducible truth, legal/privacy/customer, or authorization issues.

Do not add reviewer fan-out for deterministic questions.

## Evidence standard

**The claim ledger is a short "facts to check" list** (`CLAIM_LEDGER.csv`, blog-level since
2026-10-23). Only external facts need a row: numbers, prices, dates, quotes, and what a named
company or person said, offers or charges. Opinions, first-person lines and general advice need
no row. Each row is in one of three states:

- `VERIFIED`: a source supports it as worded (narrowed wording counts, once it is in the text);
- `NEEDS_SOURCE`: not yet sourced. It blocks release until it is sourced or cut;
- `CUT`: removed. Its `proposed_claim` quotes the cut wording (two or more words), and that
  wording must be absent from `FINAL.md`.

A piece with no external facts keeps a header-only ledger. Older ledgers keep their states and
read as: `GREEN` and `YELLOW_SOFTEN` = `VERIFIED`, `RED_RESEARCH` = `NEEDS_SOURCE`,
`RED_REMOVE` = `CUT`, and `OPINION` or `FIRST_PERSON` = a row that is no longer needed. No
`NEEDS_SOURCE` fact, and no `CUT` wording still in the text, may release (an unresolved legacy
`RED_*` likewise); `release-check` checks it on every verdict.

> **Amended 2026-10-23 by Ryan:** the ledger listed every material claim in six states
> (`GREEN`, `YELLOW_SOFTEN`, `RED_RESEARCH`, `RED_REMOVE`, `OPINION`, `FIRST_PERSON`) and said
> "No unresolved material `RED_*` may release." Blog-level controls replace it with the
> three-state facts list; the old states still read as above, so old Notes do not fail.

Every Note follows two general controls, and founder acceptance never clears either
([GOVERNANCE](GOVERNANCE.md#two-general-controls-every-note-follows)):

1. **No misinformation.** No claim is wrong, contradicted by its source, misquoted or
   misattributed, and no factual claim lacks supporting evidence; an unresolved `RED_*` claim
   counts until resolved. An `OPINION` or `FIRST_PERSON` claim is judged only for framing: it
   fails only when a source contradicts it, never for having no source.
2. **No misrepresentation of a brand or public person.** The text does not misstate or unfairly
   characterize a named company, brand, product or public person (their prices, features,
   statements, quotes or positions). Audience words such as "homeowner", "renter" or "buyer"
   are not named parties.

> **Amended 2026-10-23 by Ryan:** founder acceptance never cleared "a failed fact check, an
> unresolved `RED_*` claim, or a finding about a legal, privacy or customer issue". The two
> general controls replace that list; advice that could harm someone's privacy stays a P1 safety
> finding that Ryan may accept.

Source preference:

1. original research, official records, standards, government data, first-party technical docs;
2. high-quality independent journalism/specialist analysis;
3. practitioner material;
4. forums/social for leads or anecdotes only.

Open underlying sources where reasonably available. Claim strength may not exceed evidence strength. Do not convert allegation to fact, association to causation, one implementation to a universal result, vendor marketing to independent proof, or one local component to an all-local system claim.

Actively seek credible counterevidence for thesis-critical claims.

## Video and audio provenance

Applies whenever a Note quotes, embeds, links, or characterizes recorded speech. The text
evidence standard above is insufficient for A/V: it cannot detect a synthetic clip, a
mis-attributed venue, or a quote that exists only in machine transcription.

**When these run.** The trigger has two parts, one at each lock. The mechanical part at
Lock 1 asks whether the piece quotes or embeds recorded speech of a living person. The
ledger-driven part at Lock 2 asks whether any claim rests on recorded speech or has wording
that depends on audio or video content. Either one firing runs V1 to V8, and V1 to V8 always
complete before prose. See Intake and evidence locks. Nothing below changes because of when
it runs.

Run these gates in order. Each is pass/fail. Do not proceed on a failed gate.

### V1. Channel provenance

Resolve the uploader to the entity that ran the event. Do not accept a handle that merely
looks official.

- Find the channel link on the organization's own website, then resolve it to a canonical
  channel ID. Legacy `/user/` and `/c/` URLs must be canonicalized before comparison.
- Require **bidirectional linkage**: the org links the channel, and the channel links the org.
- Record channel age and video count. A channel created recently, or holding few videos, is a
  red flag for impersonation.

**Fail:** first-party upload cannot be established. The clip then has no provenance floor and
everything downstream is worthless.

### V2. Source integrity

- Is this the **full session** or an excerpt? Establish from the caption track's first and
  last cues, not from the title. Full sessions are far harder to fabricate and far harder to
  quote out of context.
- Determine whether captions are **human-authored or machine (ASR)**:
  `yt-dlp --list-subs <url>`. "Available subtitles" is human, "Available automatic captions"
  is ASR. This fact sets which tier the caption track can reach on its own in V3.

### V3. Wording confidence ladder

Establish which tier the wording rests on. Record the tier explicitly; never let a lower tier
be reported as a higher one.

| Tier | Evidence | Sufficient for |
|---|---|---|
| 1 | An aggregator or AI summary repeats it | **Nothing.** See V5. |
| 2 | One machine (ASR) transcription of the first-party audio | Indirect speech only |
| 3 | Human-edited published article quoting the same words | Verbatim, for the clauses it covers |
| 4 | Two independent transcriptions of the first-party audio agree word for word | Verbatim, for the span they agree on |
| 5 | A human listens to the audio at timestamp, or an official transcript from the publisher | Verbatim, full |

**Verbatim standard.** Without press corroboration (Tier 3, unchanged), a verbatim quote of
recorded speech is allowed when V1 identifies the episode or video on a first-party source and
the quoted span is word-for-word identical in at least two independent transcriptions of the
first-party audio. Examples: a third-party transcript plus our own ASR of the official file, or
a first-party caption track plus our own ASR. Independent means neither transcription was made
from the other; a site that republishes the caption track is the caption track, counted once.
Record the timestamp of the span and each transcription's source in the provenance file. A
single ASR source stays at Tier 2, indirect speech only. A human listen or an official
transcript is stronger evidence where it exists, but neither is required. V5 applies at every
tier.

Tiers 3 and 4 are **clause-scoped**, not quote-scoped. If press corroborates, or the
transcriptions agree on, two clauses of a three-clause sentence, only those two clauses may run
inside quotation marks. Trim to the corroborated span or bring the full span to Tier 4.

> **Deprecated 2026-10-22 by Ryan:** the earlier rule that a verbatim quote beyond the clauses
> press corroborates (Tier 3) needed Tier 4 (a human listens to the audio at timestamp) or Tier
> 5 (an official transcript from the publisher), with any machine transcript limited to
> indirect speech at Tier 2. Two agreeing independent transcripts of first-party audio have
> been reliable enough, and the listen gate was blocking timely Notes. The retired rows read:
> Tier 2, "ASR caption track from the first-party upload", indirect speech only; Tier 4, "A
> human listens to the audio at timestamp", verbatim, full; Tier 5, "Official transcript from
> the publisher", verbatim, full.

### V4. Synthetic-media checks

Go to the pixels, not the metadata.

- **Scene-cut detection across the quoted passage**, at multiple thresholds. A quote spanning
  an unbroken take is strong evidence against splicing.
- **Wide establishing shot**: does it show an audience, stage signage, and venue architecture
  consistent with the claimed location?
- **Physical venue markers** cross-checked against the organizer's own published material for
  that year, such as a stage theme or backdrop.
- **Disfluency density** in the ASR. Natural speech stutters, repeats, and self-corrects.
  Clean sentences are a synthesis signal, not a quality signal.
- **Temporal cross-lock, the strongest available check.** Find contemporaneous press
  describing a *physical detail* of the appearance (clothing, staging, an object), then verify
  that detail in the frames. Fabricating this requires faking the video backwards into press
  that already exists, which is not feasible.
- Search explicitly for any allegation that the specific video is fake.

### V5. Conflation check

A real quote attached to the wrong event is the most likely failure, and it is not usually
caused by careless outlets. **Assume the contamination vector is the AI-summary layer.**

- Grep the caption track for distinctive phrases from the *competing* attribution. Absence is
  a positive finding: record it as a verified negative.
- Check whether the speaker made a similar argument at multiple venues. If so, summarizers
  will flatten them, and every downstream citation must be treated as suspect.
- Inspect the video's own opening package. Organizer-produced intros sometimes contain footage
  or stills from **other events**, which is enough to mislead anything sampling early frames.
- Named outlets are often correct while summaries are wrong. Check the outlet directly rather
  than inheriting a summary's characterization of it.

**Never accept AI-summary output as corroboration.** It is circular: the summary may be
derived from the same contaminated chain, or from this very article once published.

### V6. License and reuse

Check the license on the video page. Standard platform license permits **linking and
embedding only**. Downloading, re-cutting, or re-uploading requires written permission from
the rights holder. Obtain it in writing or do not clip.

### V7. Cross-family adjudication

For any verbatim quotation of a living person, or any clip whose provenance has been
challenged, obtain reviews from at least two model families, working from an identical
evidence brief that **names its own weakest links as attackable**.

- Convergence across genuinely different families is strong. Convergence between two harnesses
  of the same underlying family is not; say so rather than counting it twice.
- On divergence, **dig, do not average**. Identify which specific evidence the more permissive
  reviewer relied on, and verify that evidence independently. A verdict resting on an artifact
  no other reviewer could open is discounted, not adopted.
- Prefer the conservative publication form unless the disagreement is resolved by evidence.

**Reviewer evidence.** Authenticity disputes are not resolved by reviewer majority. They are
resolved by artifact traceability, independent access, and capability-matched review. Add a
reviewer only when it adds a distinct evidence source, method, access path, or expertise.
Otherwise require each existing reviewer to name reproducible artifacts, and discount
evidence no other reviewer can open.

The evidence for this is that indistinct reviewers add nothing, not that reviewer count never
matters. In the expensive run three reviewers were run and honestly recorded as about two
families: "codex (gpt-5.5) and composer-2.5 are both OpenAI-lineage in different harnesses.
Realistically this is two-and-a-bit families." They shared evidence access and nothing
required them to produce reproducible artifacts. On the authenticity question the extra
reviewers only confirmed: no reviewer found manipulation and none found any allegation the
clip was fake. The permissive reviewer's unique contribution turned out to be wrong. It
leaned on a participant published transcript that another reviewer could not open and that
direct checking found did not exist. What actually resolved the disagreement was localizing
the quote to the two human corroborated clauses. That reviewer's failure argues for artifact
verification, not against review capacity.

An earlier formulation of this rule said reviewer count is not the lever. That was too
strong, and it is retired. A later reviewer bringing a genuinely different capability, a
different retrieval path, source-platform access, forensic tooling, or domain or language
expertise, can be decisive. A policy culture of "more reviewers never help" would suppress
exactly the escalation that catches a synthetic edit, a mistranslation, a cut context, or an
impersonated account. The test is distinctness, not headcount, and this rule is what makes
"dig, do not average" operational.

### V8. Embedding

Embedding recorded speech on a RyzaLab surface must not contradict what RyzaLab argues.

- Use the privacy-preserving embed endpoint where the platform offers one. Verify the claim
  rather than trusting it: count `Set-Cookie` headers on first load with no interaction.
- Prefer a **click-to-load facade** so nothing third-party loads until the reader chooses.
- The facade must not itself fetch from the platform's CDN. A remote thumbnail defeats the
  purpose.
- **The argument must never depend on the video.** Quote the passage as text so the piece
  stands with the player blocked, unavailable, or removed.

### Recording requirement

Persist per clip: canonical channel ID and the bidirectional linkage evidence, caption type,
wording tier, the exact corroborated span with its timestamp and, at Tier 4, each
transcription's source, synthetic-check results, the conflation negative,
license status, and each family's verdict. A later reader must be able to reconstruct why the
clip was trusted without redoing the work. Also record the named speaker of each quoted span.
Transcripts agreeing on words do not establish who said them; when Ryan names the speaker at
intake ([EDITORIAL_LOOP: INTAKE](EDITORIAL_LOOP.md#intake)), record it as his founder
attestation, with its source and timestamp, so a reviewer can see it was decided before drafting.

## Voice and craft

Target:

**serious research + practitioner judgment + occasional raised eyebrow**

Prefer clear opinion, concrete examples, trade-offs, varied rhythm, honest uncertainty, non-obvious synthesis, and memorable language.

Avoid fearbait, fake/invented experience or quotes, generic AI prose, corporate filler, unearned certainty, keyword stuffing, and em dashes in final RyzaLab copy.

**House style is American English.** Note prose uses US spelling and US usage. Two exceptions,
both structural rather than a matter of taste: a quotation keeps its source's spelling, and a
proper name keeps its own, so a quoted "colour" and a "Ministry of Defence" are correct as
written. This is a current house rule, not a principle. It holds for now and is revisited if
RyzaLab writes for a different primary audience. It is scoped to published Note prose, not to
this repo's internal policy and runbook files.

Humor is optional. When intended, it should sharpen the idea or expose an absurdity, not distort evidence or sound like an agent trying to be funny.

## Length

**700 words maximum per Note. Hard requirement, not a target.** No Note may exceed it for any
reason; there is no editorial judgment call that overrides this number.

**Counting convention.** The cap applies to **body words**: the prose a reader actually reads.
Exclude the title, byline, source notes, a dated correction note
([Corrections and updates](#corrections-and-updates)), and link URLs; count link anchor text. Apply the same
method to every Note, and state the method alongside any reported count. A cap that is
ambiguous about what it counts is not a constraint.

Length is a hard constraint, not a target to fill. A 500-word Note that lands is better than a
700-word Note padded to the ceiling. **Under the cap is not a violation.** Nothing may be
padded to reach it.

If a draft exceeds the ceiling, the fix is almost never uniform trimming. Cut to one thesis, and split anything that is genuinely a second argument into its own Note. A section that survives being lifted out intact was probably always its own piece.

When one research base yields several Notes, each must stand alone: its own thesis, its own opening, its own reason to exist. Do not publish a series that only makes sense read in order, and do not repeat the same evidence across Notes beyond the minimum needed to orient a new reader.

## TEST / ASSURE

Pin the exact candidate.

TEST only plausible release failures: placeholders/draft markers, prose quality, prohibited punctuation, HTML/schema/metadata, links/CTA, Notes index/sitemap, desktop/mobile rendering, and relevant repo checks.

### Baseline editorial QA

Spelling, grammar, and an AI-writing pass with the `/humanizer` skill are baseline on every
Note. Baseline means they always run, at TEST, on every candidate. They are not optional
polish and they are not conditional on the piece's subject, length, or risk.

Coverage, stated honestly, because the method here is never to claim more coverage than
exists:

| Check | Instrument | Who decides |
|---|---|---|
| British spelling variants in unquoted house prose | `scripts/editorial_precheck.py`, against an explicit variant list, with code, block quotes and quoted spans masked out | Machine. FAIL, not WARN: this class passed a human editor once and reached production. |
| General spelling | None. No spell checker is installed on the authoring machine. | Reviewer, by reading. |
| Grammar | None. Not mechanically checkable here. | Reviewer, by reading. |
| AI-writing patterns | humanizer's `prose_scanner.py`, run by `scripts/precheck.py`; the readiness reviewer lists up to three more patterns as P3 suggestions | Machine and reviewer suggest; the writer decides. Never blocks. |

The humanizer check is blog-level (amended 2026-10-23 by Ryan): `scripts/precheck.py` runs the
scanner and prints its top findings grouped by type as `NOTE` lines. They never block, and
nobody writes a disposition for them. The scanner's output is not an auto-fix mandate either:
one real Note produced 60 error-severity findings, every one of them deliberate anaphora. The
readiness reviewer also lists up to three AI-writing-style patterns (Wikipedia's "Signs of AI
writing") as P3 suggestions. The mechanical precheck FAILs (em dashes, mojibake, a non-breaking
space and the rest of the [deterministic floor](#deterministic-floor)) still block, because they
are objective.

> **Amended 2026-10-23 by Ryan:** this read "Scanner findings are mandatory to produce and
> mandatory to disposition. Every finding takes `fix` or `keep` with a reason, and a Note does
> not advance while a finding is undispositioned."

The absent spell checker is a real coverage gap, recorded rather than papered over. Until one
is installed, a general misspelling is caught by a person reading the draft or it is not caught
at all.

`policy/EDITORIAL_LOOP.md` owns the commands and the item-by-item checklist.

### Deterministic floor

Machine checks run first, always. No human grade reviewer is invoked on a candidate that has
not passed them. A mechanical failure is a cheap rejection, not a review finding.

Runner: `scripts/editorial_precheck.py`, then the existing repo harness
`scripts/validate_publish.sh`. SPEC states the rule; the scripts own the implementation.

This is enforcement of an existing rule, not a new one: "Do not add reviewer fan-out for
deterministic questions."

Evidence: the second test report in the expensive run recorded five defects that are all
scriptable, namely mojibake, a non breaking space, a malformed bold span, a stray backslash,
and an absolute self link. Separately, a British spelling ("favourite") was caught by a human
grade editor pre merge and still escaped to production, needing a follow up commit. Human
grades are the wrong instrument for both classes: too expensive for the first, too unreliable
for the second.

ASSURE is one accuracy check by one independent model on the exact tested candidate:

- open load-bearing sources;
- check the facts list, and causality, freshness and quote or allegation boundaries;
- verify edits did not change factual meaning;
- run `/publication-readiness-audit`.

Only five kinds of finding are P0 or P1, and only they block: a factual error (an external fact that is wrong, unsupported, misquoted, misattributed or stated more strongly than its evidence), a misrepresentation of a named company, brand, product or public person (`[CLASS: MISREPRESENTATION]`), a safety hazard, a broken offer or CTA, or a broken constraint. Tone, framing, word choice,
an opinion or first-person line worded strongly, style and structure are P3 suggestions and never
block (amended 2026-10-23 by Ryan; P0/P1 also covered "overclaim" and "broken promise"). The CLAIM
CHECK and CONSTRAINT CHECK are unchanged, and founder acceptance stays the rare fallback.

Release readiness requires `PUBLISH`, or `PUBLISH_FOUNDER_ACCEPTED`: every open P0/P1 finding
in the latest readiness review is one Ryan has accepted by finding id in `CONSTRAINTS.md`, and
every claim in each accepted passage is `VERIFIED`, `GREEN`, `OPINION`, `FIRST_PERSON` or `YELLOW_SOFTEN`
in the claim ledger
([GOVERNANCE: Founder acceptance of a wording finding](GOVERNANCE.md#founder-acceptance-of-a-wording-finding)).
Founder acceptance never clears either general control in the
[Evidence standard](#evidence-standard): no misinformation and no misrepresentation of a brand or
public person. `scripts/standards_review.py release-check` decides it
and records it in `STATE.yaml` `release_readiness`, never as plain `PUBLISH`.

> **Amended 2026-10-23 by Ryan:** this line read "Release readiness requires `PUBLISH`."

Preferred repair order:

`source → narrow → qualify → remove → restructure`

## Editorial scorecard

**Optional and informational** (amended 2026-10-23 by Ryan). The scorecard runs only when someone
asks for it (`scripts/standards_review.py <content_id> score`). It is not a release condition,
`all` does not run it, and no step waits on its result; its verdict below is a decision aid for
the writer and Ryan. When it runs, it scores only a candidate whose readiness passed (`PUBLISH`,
or `PUBLISH_FOUNDER_ACCEPTED`), blind, from a different model lineage than the readiness
reviewer. The release conditions live in
[GOVERNANCE](GOVERNANCE.md#what-must-be-true-before-release-approval).

> **Amended 2026-10-23 by Ryan:** this section opened "Run only after:" followed by the release
> conditions, and a score verdict of `PUBLISH` was expected before release.

Score 1 to 5:

| Dimension | Weight |
|---|---:|
| Thesis / point of view | 15 |
| Reader value | 15 |
| Originality / non-obvious insight | 15 |
| Evidence integrated naturally | 15 |
| Structure / pacing | 10 |
| Human voice / taste | 10 |
| RyzaLab distinctiveness | 10 |
| Memorability | 5 |
| CTA fit | 5 |

Weighted score:

`sum((score / 5) * weight)`

Wit control:

`N/A | PASS | FLAT | TRYING_TOO_HARD | INAPPROPRIATE`

The scorer's `PUBLISH` (informational) requires:

- weighted score >= 80;
- no dimension < 3;
- Thesis, Reader Value, Originality each >= 4;
- Wit = PASS when `wit_intended=true`;
- no named material trust/brand objection.

`REVISE`: score 65-79, a core threshold miss, or wit `FLAT/TRYING_TOO_HARD`.

`HOLD`: score <65 or material trust/brand problem.

The orchestrator prefills the scorecard with concise evidence. The founder may accept/change it. The score is a decision aid, not mathematical truth about taste.

### Scorecard log

Every scorecard run appends one entry to `scorecard_log` in `articles/<article-id>/STATE.yaml`.
Do not create a separate file per run. The expensive run's own directory shows what that costs:
`EDITOR_SCORECARD.md`, `EDITOR_SCORECARD_AB.md`, `EDITOR_SCORECARD_v2.md`, three names for one
lifecycle, discoverable only by knowing the naming habit in advance. STATE.yaml is already the
one place this desk keeps mutable per-article state; a scorecard run is exactly that.

Each entry carries: date, the exact candidate identifier it scored, the weighted score, the
per-dimension scores, the verdict, and the specific evidence lines the orchestrator cited for
the dimensions that decided the verdict, not just the numbers. A future diff needs the sentence
a score rested on, not only the score. Shape:

```yaml
scorecard_log:
  - date: 2026-08-28
    candidate: git:4f1a9c2          # a commit hash, or content: sha256:... for an unstaged draft
    weighted_score: 87.00
    dimensions:
      thesis: 5
      reader_value: 4
      originality: 5
      evidence_integration: 4
      structure: 4
      voice: 4
      distinctiveness: 4
      memorability: 4
      cta_fit: 4
    verdict: PUBLISH
    evidence:
      - "the five numbered questions are the reason for the 4 on reader_value"
      - "the single against-interest sentence is why distinctiveness scored 4, not 3"
```

This is a log, append-only, oldest first. Nothing in it is edited after the fact; a corrected
understanding gets a new entry, per `CORRECTIONS.md`'s own principle applied here.
Append-only is policy, held by convention like the rest of this file, not by a script: nothing
here enforces it mechanically yet.

### Replacement candidates

A candidate that replaces an already scored incumbent is diffed against the **last entry in
`scorecard_log`** first, not against a file found by guessing a name. If it deletes or
dissolves a passage that entry named as load-bearing, report that before commissioning any new
test, assurance, or scoring work.

This is the single most expensive avoidable event in the expensive run. A rewrite scored
76.00 against the live version's 87.00, "an 11-point regression with no dimension gaining",
and it burned a full test report, a full standards report and a full scorecard against a
candidate that was then discarded. The decisive inputs were diffable before any of that
spend: the scorecard recorded that "the five numbered questions, named by the prior editor as
the reason for the 4, are dissolved" and that "the single against-interest sentence that
earned the 5 is deleted with nothing in its place." A `scorecard_log` entry exists precisely so
that sentence is sitting in one predictable place the next time, instead of inside a file whose
name has to be reconstructed from memory.

A replacement that removes what the incumbent scored highest on argues for itself before it
is measured, not after.

### Repeated scoring is a signal, not routine

A third scoring pass on one article before release is not normal and is not free: each pass
means a candidate was commissioned, tested, assured and scored, then not released. Three
scorecard-equivalent passes is the exact shape the expensive run took (`EDITOR_SCORECARD.md`,
then `_AB`, then `_v2`). It does not mean stop scoring; it means the thesis or claim ledger
likely moved after Lock 2 rather than before it, which is exactly the ordering failure the
intake locks exist to prevent. Say so plainly in the release packet the moment a third entry is
appended, rather than letting it read as ordinary process.

## Decision and workflow metrics

Include these in the release packet:

| Metric | Target |
|---|---:|
| Unresolved facts (`NEEDS_SOURCE`, a `CUT` still in the text, legacy `RED_*`) at HITL | 0 |
| Publication readiness | PUBLISH, or PUBLISH_FOUNDER_ACCEPTED (amended 2026-10-23) |
| Editorial score, if the optional scorecard ran | >=80, informational |
| Thesis / Reader Value / Originality, if it ran | each >=4/5, informational |
| Wit when intended, if it ran | PASS, informational |
| Corrective founder turns before release HITL | 0 |
| Planned release HITL turns | 1 |
| Material assurance repair cycles | <=1 |
| Post-assurance craft refinements | <=1 |
| Independent Standards reviewers | 1 |
| New material factual claims in derivative | 0 |
| Production consumer tests before INTEGRATED | >=1 |
| Duplicate durable editorial policy copies | 0 |
| `scorecard_log` entries before release | <=2 |

Metrics expose workflow quality; never game them by hiding a defect.

## Risk tiers

Editorial work is tiered with the platform's `draft`, `confirm` and `blocked` tiers, pinned from
`ryzalab-platform`. [GOVERNANCE.md](GOVERNANCE.md) maps editorial work onto them and says who
proceeds at each tier. In short: research and drafting proceed without a check-in; publication on
any channel is `blocked` and needs `APPROVE RELEASE` from Ryan, or from Sunny or LeAnn when
they are not the author.

## Release and integration

At HITL return: title/slug, thesis, exact candidate identifiers, hard gates, the scorecard if one was run, metrics, CTA, derivative, material repairs and each post-cycle change, rollback.

After `APPROVE RELEASE`:

**MERGE:** exact approved candidate only; re-pin and rerun only invalidated checks if it moves.

**WIRE:** prove default-branch and production adoption through expected article content, Notes index, structured data, sitemap, canonical/source/CTA links. HTTP 200 alone is not proof.

**CONSUMER TEST:** fresh reader can find, understand, source, and act on the Note. Ask what it argues, what is memorable, intended action, and what materially reduced trust.

`INTEGRATED` requires approved exact candidate merged, production wiring proven, consumer test passed, and required derivative fact-consistent.

If LinkedIn is ready but not externally posted: `READY_FOR_LINKEDIN_PUBLISH`.

### Corrections and updates

Added 2026-10-23 by Ryan, benchmarked on the SPJ Code of Ethics ("acknowledge and correct
mistakes promptly and prominently"). When a published Note's substance changes (a factual
correction, a restored or removed passage, a changed claim or conclusion), the page carries a
one-line dated note at the end of the body, before the source notes, in exactly this form:

`*Updated <Month D, YYYY>: <what changed, in one plain sentence>.*`

The same change sets the page's `dateModified`. Typo, formatting and link fixes need no note.
The note is not body words under [Length](#length): `scripts/precheck.py` leaves it out of the
700-word count, as it does source notes, only when it is the one line in that form, the last
body line before the source notes (or the end), and one sentence of at most 30 words. Otherwise
it counts, and a second note or a misplaced one fails precheck.

HOLD only for material truth, legal/privacy, authorization, release, production, or consumer defects, not optional polish or desire for another opinion.
