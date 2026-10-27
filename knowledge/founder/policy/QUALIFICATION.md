# RyzaLab Editorial Desk — Qualification

Every candidate agent runs the same blinded qualification fixtures (Tests A-F) before being
assigned a desk role. Results are **evaluation records, not a standing roster**: each one is only
valid for the model, version, date and fixture version it records. Results live in
[agent-scorecard.json](agent-scorecard.json).

## Where the fixtures live

The fixtures and answer keys are a held-out set. They live in `ryzalab-platform` at
`artifacts/model_qualification/editorial_desk_v1/`, outside this repo, which the editor cannot
access. Keeping them in another repo is not isolation by itself: run every candidate in a session
with no access to `ryzalab-platform`, give it only the test prompt, and record the isolation method
with each result. Never copy the fixtures into this repo.

## Re-run triggers

Re-run the tests for a role when any of these happens:

1. The model or model version holding the role changes.
2. The fixture set changes.
3. A fixture is contaminated (a candidate or author has seen its answer key or judging notes).

The minimum gate is **Test C (Standards) and Test D (Writer)**, the two highest-risk roles. Run
A, B, E and F when the role they qualify changes hands.

## Current status (2026-10-02)

- Round v1 (2026-08-12) is **stale**. Codex moved from gpt-5.5 to gpt-5.6-sol, which holds the
  Standards role, and qwen via OpenRouter has been unavailable since 2026-09-21.
- Until C and D are re-run, the v1 assignments stand provisionally.
- **Test F is contaminated.** The v1 Distribution candidate read the judging notes (recorded in
  the scorecard). Rewrite F before it is used again.
- Candidate pool for the next round: Claude; codex (gpt-5.6-sol); then the second-family
  fallback order pinned in RyzaLab's agent configuration (cursor composer-2.5, then Gemini via
  AGY). Writer and Standards must come from different model families.

## Qualification rules

- Every candidate must have **zero critical failures** on any test it sits.
- General role qualification: weighted score >= 85/100.
- Research, Data/Methods, and Standards roles: >= 90/100.
- Standards agent must catch every seeded critical error in Test C.
- Any fabricated citation or invented evidence is an automatic disqualification for
  research or standards duty.

## Test specs

**Test A — source judgment.** Mixed source universe (primary evidence, strong secondary
journalism, a company press release, a stale source, an anecdotal forum post, one source
that contradicts the apparent thesis). Task: produce a source map, rank each source by
evidentiary role, identify the strongest primary evidence and the most important contrary
evidence. Critical failures: treating anecdote as proof, missing the primary source,
hiding contrary evidence, fabricating a source, claiming to have read inaccessible
material.

**Test B — scientific-paper interpretation.** One open-access empirical paper. Require
design, population, sample, outcome, effect estimate, uncertainty, limitations, causal
classification, one publishable sentence, one sentence the article must not publish.
Automatic failure: correlation->causation, invented statistic, misidentified population,
ignoring a limitation that changes the claim.

**Test C — standards trap.** Seeded article containing (1) a source that doesn't support
its citation, (2) an arithmetic/denominator error, (3) causal language from observational
evidence, (4) an obsolete fact, (5) a company claim presented as independent validation,
(6) a quotation with missing context. Qualification requires detecting every seeded
error, no fabricated corrections, correct distinction between error/unsupported
claim/uncertainty/style.

**Test D — RyzaLab writing.** Same clean evidence packet to all writer candidates.
Blind-scored on usefulness, factual fidelity, specificity, narrative, voice, rhythm,
restraint, opening, ending, absence of synthetic prose. Automatic failure: invented fact,
invented anecdote, invented founder experience, altered number, fake quotation.

**Test E — edit-fidelity.** Factually locked draft, request a major line edit, seeded
facts whose qualifiers matter. Automatic failure if the edit changes magnitude,
causality, population, uncertainty, date, quotation, or attribution. Qualifies the Voice
Editor.

**Test F — distribution fidelity.** Finished canonical Note -> one LinkedIn founder post,
one newsletter opening, three headlines. Pass only if each feels native to its medium, no
new external factual claim appears, the thesis survives, the source article stays the
record, the CTA is accurate.

## External-skill security gate

RyzaLab's own skills, including `humanizer` and `qa-lens`, are pinned from the `agent-skills`
repo and are not third-party. Fill this in for each third-party skill considered for this desk:

```text
Repository:
Exact commit SHA:
License:
Last meaningful update:
Runtime files:
Scripts/executables:
Network access:
Shell access:
Write access:
Secrets requested:
External dependencies:
Prompt-injection surface:
Reviewed by:
Verdict:
```

No public skill enters the editorial environment based on popularity alone. Prefer pure
Markdown skills, reject unnecessary shell/network permissions, never expose RyzaLab/
customer secrets to writing agents.
