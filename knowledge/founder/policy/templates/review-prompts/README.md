# Review prompts

The checked-in prompts for the two independent reviews in `policy/EDITORIAL_LOOP.md` stages 3
and 5. `scripts/standards_review.py` fills them in and runs them; `--print-prompts` prints the
filled text for anyone pasting into a chat instead.

| File | Review | Taken from |
|---|---|---|
| `readiness.md` | Stage 3, fact-check and publication readiness | `content/halloween-porch/reviews/prompt_standards_r1.txt` and the readiness half of `content/seven-decisions/reviews/prompt_round1.txt` |
| `readiness-rereview.md` | Stage 3 again, after the one repair cycle | `content/*/reviews/prompt_round2.txt`, `prompt_standards_r2.txt` |
| `scorecard.md` | Stage 5, blind editorial scorecard | `content/halloween-porch/reviews/prompt_scorecard.txt` |
| `image-review.md` | The image lane's visual review (not run by `standards_review.py`; the operator fills it in and runs it on the crops with a family other than the generator's: composer-2.5 for Nano Banana and Claude Design, AGY gemini for ChatGPT) | `tools/review.sh` from the home-brand-behind-the-plan run, 2026-10-22, plus the brand-likeness check |

Changes from the pilot prompts, and why:

- Piece-specific checks (the Home Assistant sentence, "no medical claims about flashing light")
  became general ones. The how-to hazard list comes from the halloween-porch round 1 findings:
  5 of 6 were safety or capability caveats, not factual errors.
- Each prompt ends with fixed machine-read lines (`READINESS:`, `DIM`, `WIT`, `VERDICT`) so the
  script can enforce SPEC's order and fill `STATE.yaml` without anyone retyping numbers.
- The scorecard prompt never carries the readiness review, the claim ledger, earlier scores or
  the voice guide: only the article and SPEC's own text. Seven-decisions' round 1 prompt asked
  one session to fact-check and score, which SPEC forbids.

**Placeholders**, filled at run time so no policy text is copied here:
`{{SPEC: <heading>}}` is that SPEC.md section up to its next heading; `{{REPO_FILE: <path> |
<label>}}` and `{{CONTENT_FILE: <name> | <label>}}` include a file if it exists and say so if it
does not; `{{CANDIDATE}}` is FINAL.md under a header with its sha256; `{{NOTE_BYLINE}}` is the
`byline` and `author` values from the piece's `note.yaml`, the page metadata the website renders
(added 2026-10-23, so a byline constraint is checked against metadata, not the body). In the
piece's `CONSTRAINTS.md`, `FOUNDER DECISION` lines that mention `ACCEPT_WORDING` are left out of
the prompt and its bundle: they answer a review after it is written, and `release-check` reads them.
Both readiness prompts ask the reviewer to tag a finding that misstates or unfairly
characterizes a named company, brand, product or public person `[CLASS: MISREPRESENTATION]`, the
only tag; `release-check` reads it exactly and refuses any other `[CLASS: ...]`, including the
retired `LEGAL`, `PRIVACY` and `CUSTOMER` (founder decision 2026-10-23). The prompts also judge an
`OPINION` or `FIRST_PERSON` ledger claim only for framing: `FAIL` only when a source contradicts it.
Since 2026-10-23 (blog-level controls) both readiness prompts define P0/P1 as exactly five classes
(factual error, misrepresentation, safety hazard, broken offer or CTA, broken constraint) and
everything else as P3; the first-round prompt also asks for up to three AI-writing-style patterns
as P3 suggestions. The scorecard prompt is optional and informational. Everything above the line
`=== MATERIAL ===` is the instruction; everything below it is sent on stdin. Lines starting with
`%%` are notes for people and are never sent.
