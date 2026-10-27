# Runbook: concept to published Note, website and LinkedIn

**Scope:** one RyzaLab Note, from an idea to a live page and a drafted LinkedIn post.
**Policy source:** `policy/SPEC.md` owns the rules. This runbook owns the *procedure* and does
not restate them. Where the two disagree, SPEC wins.

**What is tracked, and the split this leaves.** `policy/SPEC.md`, `SOURCES.md` and this
runbook are tracked. `editorial/articles/` stays uncommitted, and so do `GOVERNANCE.md`,
`QUALIFICATION.md` and `agent-scorecard.json`, for one reason: the Cloudflare publish directory
is the repo root, so every committed markdown file is served publicly. Verified, not assumed:
`https://ryzalab.com/docs/RISK_LEDGER.md` answers 200. The per-article evidence trail contains
standards reports and named-person provenance work, and the agent scorecard contains
vendor-named scores and disqualifications. None of that should be a public URL.

The honest cost of that decision: no single checkout contains the whole policy set, so
`GOVERNANCE.md` and `QUALIFICATION.md` cite a `SPEC.md` their own working tree does not have.
Whoever holds the editorial desk owns closing that, either by serving `editorial/` a 404 and
then tracking it, or by moving the untracked policy to a private repo. It is a real defect, and
it is recorded here rather than left for the next reader to trip over.

**Update 2026-10-02: resolved.** SPEC, SOURCES and this runbook moved to the private
`ryzalab-content` repo (`policy/`), which is never served, so the policy set can be tracked
here in full. `GOVERNANCE.md`, `QUALIFICATION.md` and `agent-scorecard.json` were recovered
into `policy/` the same day from a local snapshot dated 2026-08-28. Paths elsewhere in this file still name their `ryzalab-website` locations; see
`policy/README.md` for the map.
**Status:** derived from the technological-autonomy loop (PRs #77, #78, #79, #80), including
the parts that went wrong.

Every gate here exists because something failed without it. Where that is true, the failure is
named. A gate whose failure mode you cannot state is a gate nobody will keep.

---

## 0. Before anything

Confirm you are not duplicating live work. This repo is worked by multiple sessions.

```bash
git fetch origin main && git log --oneline -5 origin/main
gh pr list --state open --limit 20
```

**Merge rule, from `docs/governance/GOVERNANCE_CONDITIONS.md`:** agents may merge when the
change is reversible, CI is green, **and an independent reviewer has passed it.** All three.
See stage 7.

### When Edie assists in Grok

Use the existing [Grok operating model](templates/grok/README.md), with its single JSON control
record and closed phase/decision values. The procedure Edie leads is
[The Edie-led run, end to end](#the-edie-led-run-end-to-end), below. The terminal operator
preserves each reply and validates each saved control snapshot against the preceding one:

```bash
python3 scripts/grok_contract.py content/<content_id>/reviews/grok_control.json --previous content/<content_id>/reviews/grok_control_previous.json --json
```

Omit `--previous` only for the initial snapshot. Contract validity establishes local consistency
of the supplied state and bytes. It does not authenticate a human decision, verify an external
transfer, run the official editorial checks or grant release/posting authority. Those existing
checks and decisions remain in this runbook. The model's output names missing artifacts and
evidence; it cannot convert an advisory score or a Drive `FINAL` selection into an approval.

---

## The Edie-led run, end to end

Edie, the Grok Bot ([operating model](templates/grok/README.md)), leads Ryan through one Note
run. Agents do the lane work. Edie never publishes, posts or merges, and nothing here changes
G1 to G4, the readiness gates or who approves. What it changes is order: every decision that
surfaced mid-run on 2026-10-22 is now asked up front, and every manual step that cost a round
trip is now a script or a command given once. The stages below are the same ones this runbook
already defines; the [lessons](#lessons-from-home-brand-behind-the-plan-2026-10-22) at the end
say which failure each step prevents.

This is path 1. Path 2 is a team member with write access taking a Note through GitHub
themselves, with a Repository Maintainer running the readiness review by hand
([README: Path 2](../README.md#path-2-a-team-member-submits-a-note-through-github)). Both paths
use the same gates: precheck, readiness and release-check, `APPROVE RELEASE` on the exact
`FINAL.md` sha256 from an approver [GOVERNANCE](GOVERNANCE.md#tiers) allows, and a merge through
`scripts/merge_pr.sh`.

```
PREFLIGHT        Ryan: bash scripts/preflight.sh; every FAIL fixed first
INTAKE           every founder decision in one message, recorded before any drafting
  |
  +-- editorial lane   draft, precheck, readiness, score     agent, wt-content-<content_id>
  +-- image lane       generate, review, contact sheet       agent, empty scratch dirs
  |
G1_COPY          CHECKS=PASS on exact FINAL.md bytes; G1 binds that sha256
  +-- website lane     starts from that hash, nothing earlier  Ryan, wt-website-<content_id>
G2_IMAGE         Ryan picks from the contact sheet; at most two edit rounds
WAIT_NOTE_LIVE   website PR merged; the live page proves the content (section 8)
G3_LINKEDIN      LINKEDIN.md, distribution_link.py, the /n/ code
G4_POST          short link and linkedin_check --live pass; a person posts
CLOSED_OUT
```

### One-time setup (Ryan)

Agents cannot do these two settings changes: the permission classifier refuses an agent that
edits mounts or its own permissions, which is correct. Ryan does each once. Each command goes in
its own block; copy only the line inside it.

**1. Mount Google Drive in WSL at every start.** Add the mount to `/etc/fstab`:

```bash
sudo mkdir -p /mnt/g
```

```bash
echo 'G: /mnt/g drvfs defaults,uid=1000,gid=1000 0 0' | sudo tee -a /etc/fstab
```

```bash
sudo mount -a
```

```bash
ls "/mnt/g/My Drive/01. RyzaLab"
```

WSL reads `/etc/fstab` at start unless `/etc/wsl.conf` sets `mountFsTab = false`. One limit
remains: if Google Drive for desktop has not started on Windows when WSL starts, `/mnt/g` is
empty. Preflight reports that as `WARN drive`; `sudo mount -t drvfs G: /mnt/g` fixes it for the
session, and intake falls back to a pasted draft.

**2. The standing permission rule for relayed founder decisions.** Open
`/home/ryang/repos/ryzalab-content/.claude/settings.local.json` (it is gitignored) and add
these entries to the `permissions.allow` list, keeping the entries already there:

```json
"Edit(//home/ryang/repos/wt-content-*/content/**)",
"Write(//home/ryang/repos/wt-content-*/content/**)",
"Edit(//home/ryang/repos/wt-website-*/notes/**)",
"Write(//home/ryang/repos/wt-website-*/notes/**)",
"Edit(//home/ryang/repos/wt-website-*/images/notes/**)",
"Write(//home/ryang/repos/wt-website-*/images/notes/**)",
"Edit(//home/ryang/repos/wt-website-*/docs/media/**)",
"Write(//home/ryang/repos/wt-website-*/docs/media/**)"
```

The rule covers a piece's own files and the website's Note, Note image and media-ledger paths,
in worktrees named by step 3. It deliberately does not cover `policy/`, `scripts/`,
`functions/` or `.claude/`: those stay reviewed changes. If the classifier still refuses a
relayed decision, do not look for a way around it. Ryan records the line himself:

```bash
python3 scripts/record_line.py <content_id> PROVENANCE.md
```

and pastes the line Edie gave at its prompt, then Enter and Ctrl-D. The line goes through
stdin, so an apostrophe or `$` in a quote is never read by the shell; the script accepts only
founder decision lines and prints the file's new sha256. Use `CONSTRAINTS.md` for a
`FOUNDER DECISION` line.

**3. Worktree names.** The rule in step 2 matches these names, so lanes use them and nothing
else. Claude Code's own `.claude/worktrees/agent-*` worktrees do not match; do not use them for
a content or website lane.

```bash
git -C /home/ryang/repos/ryzalab-content worktree add /home/ryang/repos/wt-content-<content_id> -b content/<content_id> origin/main
```

```bash
git -C /home/ryang/repos/ryzalab-website worktree add /home/ryang/repos/wt-website-<content_id> -b notes/<content_id> origin/main
```

### PREFLIGHT

Ryan's main checkout comes to current `main` first, because preflight lives there:

```bash
git -C /home/ryang/repos/ryzalab-content checkout main
```

```bash
git -C /home/ryang/repos/ryzalab-content pull --ff-only
```

```bash
cd /home/ryang/repos/ryzalab-content
```

```bash
bash scripts/preflight.sh
```

It prints one line per check and changes nothing beyond a fetch. `FAIL` stops the run and
names its fix: main checkout not on `main`, dirty, behind `origin/main`, or missing
`scripts/merge_pr.sh`. `WARN` narrows the run: Drive not mounted (intake takes a paste), no
permission rule (the record-command fallback applies), a missing tool (that lane or generator
is unavailable), no Pillow, no website checkout, or a worktree outside the naming in step 3.
Ryan pastes Edie only the `RESULT` line and any `FAIL` line, never the whole output, and never
pastes output back into the terminal.

### INTAKE

Edie asks every founder decision in one numbered message (her prompt, section W) and Ryan
answers once. This is not the front end's 0-INTAKE below: a new idea still runs its intake
lanes and locks; this step collects Ryan's decisions for the run. The operator records each answer before any drafting:

| Decision | Recorded in |
|---|---|
| Author (`VERIFIED V12`) and byline | `note.yaml` `author` and `byline`; the readiness review reads them there as page metadata |
| `content_id`, slug, attribution short code | `note.yaml`; the content folder name |
| Post date | the `distribution_id` date, when `distribution.yaml` is written |
| Cross-links | the piece's `PLAN.md` or `STATE.yaml` notes, for the website lane |
| Named speaker for each quote of recorded speech | `PROVENANCE.md`, as a founder attestation line |
| Image generators | the image lane's instructions |
| Extra photos for the website library | the image lane's instructions |
| Draft source: Drive file or paste | `PROVENANCE.md`; a paste also gets `SOURCE_DRAFT.md` and its sha256 |
| CTA price exception, if any | `CONSTRAINTS.md`, in the exact section G format |

The speaker line, one per quotation, is Ryan's attestation of who is speaking. It is recorded
up front so a reviewer finding on speaker identity is answered by citing it, instead of
stopping the loop for an override. It does not replace the other provenance gates in
`policy/SPEC.md` (V1 to V8):

```text
FOUNDER ATTESTATION: SPEAKER BY RYAN; CONTENT_ID=<content_id>; QUOTE=<first six words>; SPEAKER=<full name>; SOURCE=<URL> AT <mm:ss>; DATE=<YYYY-MM-DD>
```

A pasted draft is saved byte for byte as `content/<content_id>/SOURCE_DRAFT.md`. Its hash is
taken from the saved file:

```bash
sha256sum content/<content_id>/SOURCE_DRAFT.md
```

and recorded in `PROVENANCE.md`, saying plainly that it is a paste:

```text
SOURCE DRAFT: pasted text, not the Drive file; SHA256=<64 hex>; RECEIVED=<YYYY-MM-DD> FROM <operator>
```

### Lanes, in parallel from the start

As soon as INTAKE is recorded the operator delegates two lanes at once, each to its own agent:

- **Editorial lane**, in `wt-content-<content_id>`: draft, the stage 2 floor, readiness, repair,
  and the optional score (stages 1 to 5; the score is informational since 2026-10-23). `scripts/standards_review.py` already sends prompts that say "review
  only the stdin block" from an empty scratch directory, because codex is slow when it opens
  repo files itself, and it already picks a scorer from a different lineage than the readiness
  reviewer: codex and composer are both OpenAI, so an OpenAI readiness gets an AGY (Gemini)
  score.
- **Image lane**, in empty scratch directories (below).
- **Website lane**, Ryan's, waits only for the `FINAL.md` sha256 that G1 binds. It starts from
  those bytes and nothing earlier, so a late edit cannot reach the site unreviewed.

### The image lane

Generators are the ones Ryan chose at INTAKE. Each runs from its own empty scratch directory,
never from a worktree, with the prompt inline. What works and what does not, as of 2026-10-22:

- **ChatGPT, through codex's image tool.** Works. The image model is not exposed, so record it
  as "ChatGPT image tool via codex exec, model not reported". The tool saves under
  `~/.codex/generated_images/` and the prompt tells codex to copy the file into the current
  directory unchanged:
  `codex exec --skip-git-repo-check -s workspace-write "Use your built-in image generation tool to generate one image from the prompt below, landscape 16:9. Copy the generated file byte for byte into the current directory as <concept>.png. Do not draw it with code, do not re-encode it, do not create other files. Then report the image model and the saved path. PROMPT: <prompt>"`
- **Nano Banana 2, through AGY.** Agent model `gemini-3.8-flash-high`, pinned in the script (the
  default model hit a 429 quota on 2026-10-22). Generate with the wrapper, never with a permission flag:
  `python3 scripts/agy_image.py --prompt-file <prompt.txt> --out <empty scratch dir> --name <concept>_nanobanana`.
  AGY's print mode soft-denies shell commands that are not on its allow list, so a prompt that
  asks AGY to copy the image fails at its `cp` even though the image generated. The wrapper tells
  AGY not to copy or run anything, takes the path AGY replies with (it must be a fresh image
  inside `~/.gemini/antigravity-cli/brain/`), and copies it byte for byte. AGY never starts in
  `--out`: each run gets a private, empty 0700 temp folder that is deleted afterward, because AGY
  auto-allows reads and writes in its working folder. The agent model is pinned in the script.
  AGY gets only an allow-listed environment (home, path, locale, terminal, session bus), never
  tokens such as `GH_TOKEN`. After each run the script reads the conversation records AGY created
  during that run and carry the random run id the script put in the prompt (never chosen from AGY's
  reply, so a concurrent AGY run is not mistaken for this one), and fails closed, keeping nothing,
  if AGY attempted any command. Every image the run left in AGY's `brain/` folder, drafts and hidden
  media copies included, is deleted; if a deletion fails, the run exits 1 and names the file. Once the copy's sha256 matches,
  the source image is deleted from AGY's `brain/` folder, so the copy in the run's scratch
  folder is the one retained record; it follows the image lane's retention, and the media
  ledger records it for the image that ships.
  `--dangerously-skip-permissions` is not used and not asked for (Antigravity's
  [headless mode docs](https://antigravity.google/docs/cli/headless/) recommend scoped rules over
  it; this path needs no rule at all). Verified 2026-10-23: 1376x768, exit 0.
  - **Owner:** the operator running the image lane builds and runs it; Ryan owns the decision
    to keep or drop the Nano Banana route, and any change to AGY's own permission settings.
  - **On failure:** exit 2 is a usage problem (bad `--name`, missing prompt, agy not installed,
    destination exists): fix the input and rerun once. Exit 1 means AGY ran but returned no
    acceptable image: rerun once; on a second exit 1, or a 429 quota or retired-model error,
    stop retrying, drop Nano Banana for this run, tell Ryan at G2, and keep the other
    generators. A `soft-denied` notice means AGY tried a command anyway: never add the flag to
    get past it; record it in the run's notes and drop the route for this run.
  - **Rollback:** if the route keeps failing, Ryan picks ChatGPT and Claude Design only at
    INTAKE; nothing else depends on the wrapper.
- **Claude Design**, through an Artifact Design canvas. Works. The account's design system is
  empty, so the brief carries the house style itself (realistic, warm natural light, no text,
  logos, house numbers or faces).
- **Higgsfield.** 0 credits. Not used unless Ryan funds it.

The image rules and the export steps are the website's (`ryzalab-website`
`docs/PUBLISHING_HARNESS.md` section 9) and the [media standard](media/STANDARD.md); this lane
does not restate them. Its own steps:

1. **Review crops.** `python3 scripts/image_lane.py crops <candidate> --out <dir>` writes the
   720 px and 390 px views and the 1200x630 card and 1200x670 header crops.
2. **Visual review by a family other than the generator's**, with
   [the image review prompt](templates/review-prompts/image-review.md). It includes a
   brand-likeness check: a device that reads as a specific real product (a Ring doorbell, a Nest
   thermostat) is a P1 even with no logo. Fix or regenerate on any P1 or P2. Pick the reviewer
   per candidate: composer-2.5 for Nano Banana and Claude Design candidates; AGY
   (`gemini-3.8-flash-high`) for ChatGPT candidates, because composer and the codex image tool
   are both OpenAI lineage (#55). A candidate with no cross-family review is not offered at G2:
   if AGY is unavailable (for example a quota error), drop the ChatGPT candidates from the contact sheet and tell Ryan why.
3. **Contact sheet.** `python3 scripts/image_lane.py sheet <candidates...> --out contact_sheet.jpg`
   labels each card crop with its number, filename and sha256 prefix. Ryan picks by number at G2.
   At most two edit rounds follow on the pick; after that Ryan chooses among what exists,
   `USE_EXISTING` or `NO_IMAGE`.
4. **Extra photos for the website library**, only when Ryan said yes at INTAKE.
   `python3 scripts/scrub_image.py scrub <files...> --out "/mnt/g/My Drive/01. RyzaLab/030_Brand_Marketing_and_Web/photos-ryzalab-website"`
   re-encodes each from its pixels (no EXIF, XMP, ICC, C2PA/JUMBF, comments or trailing bytes),
   removes generator names from the filename, and runs the byte-level marker check on every file
   it writes; `python3 scripts/scrub_image.py verify <files...>` re-runs that check. SynthID and
   similar watermarks are in the pixels: they survive and are not attempted. Scrubbing removes
   file metadata, not the fact that the image was generated, and the media ledger still records
   the generator.

### PRs and the merge gate

Every PR in the run follows [How a PR merges](GOVERNANCE.md#how-a-pr-merges). These steps are
what made today's round trips:

1. **PR body.** Exactly one `## Risk Tier` section with exactly one checked box. Edit a title or
   body with `gh api -X PATCH repos/surencio/<repo>/pulls/<N> -f title='<title>' -F body=@<file>`.
   `gh pr edit` fails on this account with a GraphQL "Projects (classic)" error.
2. **Independent review.** Codex, from an empty scratch directory, with the diff on stdin and a
   prompt that says "answer only from stdin" and ends with one line `VERDICT: PASS` or
   `VERDICT: FAIL`. Save the final message alone with `codex exec -o <file>`; the run log is not
   the review output. Read the model from the log's `model:` line. Fix P0/P1, backlog P2/P3 as
   issues that name the finding id.
3. **Closeout.** Build it with `scripts/closeout.py` from the review output file, the full head
   sha, the tier and one `--finding` line per connector finding, and check it before posting:

   ```bash
   python3 scripts/closeout.py --repo surencio/<repo> --pr <N> --head <full head sha> --tier Confirm --review-output <file> --reviewer-family codex --reviewer-model <model> --author-families <families that wrote the PR>
   ```

   It hashes the embedded output exactly as the gate reads it back, requires a `fixed`
   finding to cite the full current head, requires an open issue naming each backlogged
   finding, checks the PR's Risk Tier section, requires a line for every bot finding the gate
   sees, and evaluates the gate with the closeout added. `--author-families` has no default:
   name every model family that wrote the change (for example `claude`, or `claude, codex`),
   and pick a reviewer family outside it. `--repo` defaults to `surencio/ryzalab-content`; a
   website PR needs `--repo surencio/ryzalab-website`. The check uses this repo's copy of the
   gate and the platform policy, so for a website PR also confirm with the website's own
   `scripts/qa_merge_gate.py` after posting. CI must be green first; a pending or failed check
   blocks the post. Ryan's approval comes after the closeout and does not. Dispositions count only inside this
   attesting comment; a standalone disposition comment is ignored. When it prints
   `RESULT PASS`, add `--post` once. It refuses a second closeout for the same head; a failing
   gate is diagnosed with `python3 scripts/qa_merge_gate.py --repo surencio/<repo> --pr <N>`,
   not by posting again.
4. **Connector threads.** At Draft tier the gate passes with open connector findings, but
   `scripts/merge_pr.sh` still refuses an unresolved connector thread without a gate-validated
   disposition. Put the `CODEX-FINDING` line in the closeout (step 3 requires it), or reply to
   and resolve the thread.
5. **Merge (Ryan).** Each repo merges with its own wrapper from its own main checkout, so a
   PR number is never run against the wrong repo: `/home/ryang/repos/ryzalab-content` for a
   content or policy PR, `/home/ryang/repos/wt-website-main` for a website PR. That worktree exists only to hold
   `main` for merges; the primary website checkout is often on a feature branch with work in
   progress, and git refuses to check out `main` in two places at once. Before every
   merge, including the second of two in a row (content shown; for a website PR, `cd` into
   `/home/ryang/repos/wt-website-main` instead):

   ```bash
   cd /home/ryang/repos/ryzalab-content
   ```

   ```bash
   git checkout main
   ```

   ```bash
   git pull --ff-only
   ```

   ```bash
   bash scripts/merge_pr.sh <N>
   ```

### Policy and permission changes

When the run shows that a rule, template, script or permission should change, an agent drafts
it as a patch or script and stops; it does not apply it. Edie tells Ryan "this is a policy
change: an agent drafts it and you apply it". Ryan applies it, or it lands as a `confirm`-tier
PR. An agent whose edit is refused as self-modification or a permission grant saves the patch
and reports exactly what Ryan needs to apply; it does not retry another way.

### Lessons from home-brand-behind-the-plan (2026-10-22)

The run that produced ryzalab-content #45 and #46 and ryzalab-website #238. Each step above
exists because of one of these.

> *Failure this prevents:* the Drive "final version" folder was not synced into WSL and `G:`
> was not mounted, so the draft could not be read until Ryan ran `sudo mount` by hand. Now
> `/etc/fstab` mounts it, preflight checks it, and intake accepts a paste with its sha256.

> *Failure this prevents:* three rule questions surfaced mid-loop: the SPEC V3 listen gate
> (since deprecated), the speaker identity behind a quote (a Codex P1 cleared by Ryan's
> override) and the self-approval rule (since deprecated). Each stopped the loop. INTAKE now
> asks every founder decision before drafting, and the speaker answer is an attestation on file.

> *Failure this prevents:* founder decisions relayed to agents were refused by the auto-mode
> classifier as instruction poisoning, and agent edits to policy and permissions were refused
> as self-modification. The standing rule covers content paths only; policy changes are patches
> Ryan applies; the fallback is a record command Ryan runs.

> *Failure this prevents:* the image lane lost time to Higgsfield at 0 credits, an AGY 429 on
> its default model and AGY refusing to save images without `--dangerously-skip-permissions`,
> and one Nano Banana doorbell looked like a Ring. Generators are now chosen at INTAKE, AGY
> runs through `scripts/agy_image.py` with no permission flag (2026-10-23: the refusal was AGY's
> own `cp` being soft-denied in print mode, not the image tool), and the visual review checks
> brand likeness.

> *Failure this prevents:* six merge-gate round trips: a closeout hash taken over the run log
> instead of the embedded output; a `fixed` finding citing the fixing commit instead of the
> head; a standalone disposition comment the gate never reads; a PR body without exactly one
> Risk Tier box; an open connector thread that the Draft-tier gate passed but `merge_pr.sh`
> refused; and repeated closeout re-posts flagged as a CI bypass. `scripts/closeout.py` checks
> all of these before anything is posted, and posts once.

> *Failure this prevents:* `gh pr edit` failed on a GraphQL Projects (classic) error; the
> PATCH call above works.

> *Failure this prevents:* Ryan's main checkout was on an old branch without
> `scripts/merge_pr.sh`, and after one merge `main` was stale for the next. Preflight checks
> both, and every merge starts with `git checkout main` and `git pull --ff-only`.

> *Failure this prevents:* terminal output was pasted back into the shell. Edie now gives one
> command per block and asks for only the `RESULT` line.

> *Failure this prevents:* lanes ran one after another. The editorial and image lanes now start
> together after INTAKE, and the website lane waits only for the G1 hash.

> *Failure this prevents (2026-10-23, content PR #73):* the reinstated original of
> home-brand-behind-the-plan, Ryan's own text with every claim verified, stayed at readiness `HOLD`
> because Codex kept F1 to F8 (tone and framing of the author's wording) and F9 (the byline, which
> lives in `note.yaml`, not the body) open despite Ryan's recorded acceptances: "founder decisions
> ... do not convert unsupported claims into evidence-compliant claims". Founder acceptance is now
> a defined line that `release-check` reads, and the reviewer gets the byline as metadata.

> *Failure this prevents (2026-10-23, PR #68):* a script that holds a safety boundary, here
> `agy_image.py` deciding which AGY files are this run's and deleting them, took six four-lens
> review rounds, because each fix was reviewed before its failure paths were. Two reclassifications
> to non-blocking were also rejected. Before asking for review of such a script: list every
> `return` and exception after the external tool starts and prove each one runs the cleanup;
> establish ownership from something the tool cannot choose (a run id in the prompt), never from
> its reply or from timing; and mutation-test every guard, since a check whose test still passes
> with the check removed tests nothing. Reclassify a binding finding only when you can show the
> lens's own criterion is not met.

> *Failure this prevents (2026-10-23, PR #74):* a README rewrite that made the workflow
> role-neutral was drafted against `main` before four policy PRs (#78, #87, #92, #83) merged the same day. Its
> restated steps silently undid them: "any team member" could record a release decision, merge
> a `confirm` PR or do the website step, though GOVERNANCE names who may; the readiness gates
> reverted to the retired "no legal, privacy or customer issue" text and a required scorecard;
> and "ordinary language" replaced the exact `APPROVE RELEASE` string. A text merge showed only
> four conflict hunks; the reversions merged cleanly. Before merging a doc that restates policy,
> diff every restated rule against `origin/main` of the policy it cites (GOVERNANCE, SPEC, this
> runbook), not just the conflicts. A function label (Reviewer, Publisher) says what work is
> done; GOVERNANCE says who may decide it, and the doc must say both.

---

## Front end: idea to evidence packet

Everything below runs before stage 1 (IMPLEMENT), which already assumes a drafted evidence
packet exists without saying how one gets there. This section says how.

It replaces an earlier version of this section that carried three defects, all found by audit
rather than by review, and all worth recording because they are the kind of thing this runbook
exists to prevent. It cited a risk-tier trigger (`E2`) that canonical `policy/SPEC.md` does
not define. It imported a three-tier risk model from a different repo's engineering policy and
applied it to editorial risk, which produced a tier whose only real content was permission to
go faster. And its own tracking disclosure was wrong about what `git ls-files editorial/`
returns. Corrections are in `editorial/HARNESS_CHALLENGE_LOG.md`.

### Why the earlier tier model was the wrong shape

The founder's original ask was under two hours from idea to publish. The earlier answer was a
`Fast` tier that reached that number by having less to do. That is the wrong trade, and the
evidence says it was also solving the wrong problem.

Two completed runs sit in `editorial/articles/`. The expensive one was not expensive because
the gates were strict. It was expensive for four specific reasons, each of which is now
addressed by a mechanism rather than by an exemption:

| What actually cost the run | Evidence | Fix |
|---|---|---|
| The length ceiling moved after prose existed | `CONTENT_ARCHITECTURE.md` records the trigger as a new SPEC length ceiling, which is what forced the article split | Intake lock |
| Evidence was adjudicated after drafting, so findings invalidated written text | The clean run passed its evidence gate against a 12 row claim ledger before drafting, and pre-registered two claims as `RED_REMOVE` by design | Intake lock |
| The A/V provenance question surfaced when the founder challenged it, with a v1 already published and a tested v2 in hand | The mechanical tell was earlier and available: v2 introduced a verbatim quotation where v1 had deliberately avoided one | Mechanical provenance trigger at intake |
| Human grade reviewers were spent on a candidate cheap checks would have rejected | A rewrite scored 76.00 against the live 87.00, and burned a full test report, standards report and scorecard before that was known | Deterministic floor, replacement diff |

None of those four is a governance problem. All four are scheduling problems: the work happened
in the wrong order, or was discovered after it was expensive to act on.

**So the gates do not change. What changes is how early you know what they will cost.** A piece
that quotes no recorded speech and carries a short claim ledger can move quickly, not because
anything was waived, but because the provenance gates have nothing to chew on and there is
little to verify. Same gates, same verdicts. A piece that does carry those things is expensive,
and now you know that at intake rather than at hour six.

### The two-hour target, kept as a hypothesis rather than deleted

The earlier version answered the under-two-hours ask with a tier that reached the number by
having less to do. Withdrawing that was right. Withdrawing the requirement along with it was
not, and an outside review called that what it was: rigor used to dodge a business constraint.

So the target stands, scoped and unproven:

- **Target.** Under two hours, idea to release packet, for a piece with no A/V provenance work
  and a short claim ledger.
- **Out of class until measured.** A/V provenance, a contested primary-source claim, or a piece
  entering as an open research question. These are not slower tiers, they are simply pieces with
  more to verify, and no honest estimate exists for them yet.
- **Instrumentation.** Wall clock per stage, floor rejections before any reviewer is invoked,
  re-intakes, re-gates, and kill points.
- **Exit rule.** After three to five real runs, either certify the target for the in-class case
  or report plainly that it conflicts with the gates, and say which gate.

No per-stage budget is set, and the earlier 10-15 minute figure is gone for good: it was invented
before a single measured run. A target with a measurement plan and an exit rule is a commitment.
A number with neither is decoration.

### 0-INTAKE, then Lock 1 (parallel, then one serial lock)

Three lanes run concurrently on the bare idea. None of them writes prose.

- **Provenance lane, mechanical part.** Does the piece quote or embed recorded speech of a
  living person? Yes routes `SPEC.md` gates V1 to V8 to run during research rather than after
  drafting. The judgment part of this question cannot be answered yet and is deliberately
  deferred to Lock 2, for reasons below.
- **Redundancy lane.** Does an existing Note already make this argument? Checks `notes/*.html`
  and `editorial/articles/*/STATE.yaml`.
- **Differentiation lane.** Is this RyzaLab's point of view, or a restatement of consensus,
  against `RYZALAB_VOICE.md`'s bar.

**Lock 1** is then written serially into `articles/<id>/PLAN.md`: the body-word ceiling, the
question the piece is asking, and the first-pass provenance determination.

A question, not a thesis. An earlier version of this section demanded a finished thesis and a
claim ledger here, before any research existed. That was wrong twice over: a ledger is an output
of research, and the clean run proves the real order (ASSIGNMENT, then four research lanes, then
`CLAIM_LEDGER.csv`, then `EVIDENCE_GATE.md`). An outside review reached the same conclusion by a
different route: a lock demanding certainty before research either gets under-researched or
produces a thesis vague enough to constrain nothing. A piece may enter as an open question. What
is forbidden is prose before Lock 2, not uncertainty before research.

### 0-RESEARCH (parallel, lanes chosen by Lock 1)

- **Evidence and data**, the existing Data and Methods role.
- **Countercase**, the existing Research and Countercase role.
- **Timeliness**, which the rest of this runbook never asks: why does this deserve attention
  now. Must cite a specific dated primary item. An unsourced claim that something is trending
  is a finding to report, not evidence to use.

**Provenance, when Lock 1 set it, fans out into four evidence lanes rather than one.** This is
the parallelism the first version of this refactor missed, and it is parallel evidence
gathering, not parallel verdicts: one lane resolves and archives the source media, one finds
independent transcripts and contemporaneous reporting, one runs the identity, venue and
edit-integrity checks, and one maps the quoted span back to timestamps. They feed one V1 to V8
determination. Four agents retrieving different evidence is cheap and additive. Four agents
forming opinions about the same evidence is neither, which is the next section.

Start from `policy/SOURCES.md`, which carries the domains both prior runs actually used,
their preference level, interested-party flags, and which ones are known to block automated
fetches. It is a starting point and an access cache, never an allowlist: presence there does
not make a claim citable, the claim ledger still decides that.

### Lock 2, at the evidence gate, before any prose

Written when research lands: the thesis as research actually left it, the claim ledger with
the short facts list (external facts only, each `VERIFIED`, `NEEDS_SOURCE` or `CUT`, including
any wording pre-registered `CUT` as a guardrail; SPEC: Evidence standard), and the
completed provenance determination now that the ledger exists.

The second half of the provenance trigger fires here, and it is the half that would have caught
the real case: does any claim in the ledger rest on recorded speech, or does its wording depend
on audio or video content, including tone, sequence, speaker identity, edit integrity, or
translation? Yes fires V1 to V8 even if Lock 1 said no. A quotation appearing in a revision
where none existed before fires it again.

Prose starts after Lock 2, never before. Changing a Lock 1 constraint afterwards is a re-intake;
changing a Lock 2 item is a re-gate.

### The deterministic floor, running before every expensive stage

`scripts/editorial_precheck.py` plus the repo's existing `scripts/validate_publish.sh`. No human
grade reviewer is invoked on a candidate that has not passed them.

> **How to run it here.** From the `ryzalab-content` folder, no website checkout needed:
> `python3 scripts/precheck.py content/<content_id>`. It checks `FINAL.md` and prints one line
> per check: `PASS`, `WARN` (read it and write down fix or keep) or `FAIL` (fix the draft and run
> it again). The last line says `RESULT PASS` or `RESULT FAIL`. It is a port of the website's
> `editorial_precheck.py` and also runs the humanizer scanner, so it is the whole machine floor
> for a draft. Every PR runs it on any `FINAL.md` it changes. The rendered-page checks
> (`validate_publish.sh`) stay with Ryan in the website repo. This is not new policy, it is
enforcement of `SPEC.md`'s existing line: do not add reviewer fan-out for deterministic
questions.

It earns its place from real escapes. The expensive run's second test report recorded five
defects that are all scriptable: mojibake, a non-breaking space, a malformed bold span, a stray
backslash, an absolute self-link. And a British spelling was caught by a human grade editor
before merge and still reached production, needing a follow-up commit.

### Replacement candidates

A candidate replacing an already scored incumbent is diffed against the last entry in
`STATE.yaml`'s `scorecard_log` first. If it deletes a passage that entry named load-bearing,
that is reported before any new test, assurance or scoring work is commissioned. Rule, schema
and evidence live in `SPEC.md`.

### On adding reviewers

The instinct when a verdict feels uncertain is to add another reviewer. The expensive run did
exactly that. Three reviewers ran, honestly recorded in `ADJUDICATION.md` as about two families
rather than three. On the authenticity question they only confirmed each other: none found
manipulation, none found any allegation the clip was fake. The permissive reviewer's one unique
contribution was wrong, resting on a transcript no other reviewer could open and that direct
checking found did not exist. What resolved it was localizing the quote to the two
human-corroborated clauses.

An earlier version of this section drew the wrong conclusion from that: "reviewer count is not
the lever." An outside review refuted it, correctly. One run shows that reviewers with
overlapping evidence access and no reproducibility requirement add nothing. It does not show
that a reviewer bringing a genuinely different capability, a different retrieval path,
platform access, forensic tooling, language or domain expertise, would add nothing. Writing the
stronger claim into policy would suppress exactly the escalation that catches a synthetic edit
or an impersonated account.

The rule in `SPEC.md`'s V7 gate is therefore narrower and more useful: add a reviewer only when
it adds a distinct evidence source, method, access path, or expertise. Otherwise require each
reviewer to name reproducible artifacts, and discount evidence no other reviewer can open.

So parallelism is added to discovery, retrieval and deterministic rejection: intake lanes,
research lanes, provenance evidence lanes, and mechanical checks. It is not added to subjective
final verdicts unless the added reviewer brings a distinct capability.

### Topology, stated once

```
0-INTAKE       PARALLEL x3    provenance (mechanical) / redundancy / differentiation
   |
   +-- LOCK 1  SERIAL         ceiling, the question, first-pass provenance
   |
0-RESEARCH     PARALLEL x3    evidence / countercase / timeliness
   +--         PARALLEL x4    provenance evidence lanes, when Lock 1 set it:
   |                          media archive / independent transcripts /
   |                          identity and edit integrity / timestamp mapping
   |
   +-- LOCK 2  SERIAL         thesis, claim ledger, provenance determination
   |                          EVIDENCE GATE. No prose before this point.
   |
[FLOOR]        MECHANICAL     editorial_precheck.py, before every stage below
   |
1 IMPLEMENT    SERIAL, single writer
2 TEST         SERIAL         floor first, humans only on what survives
3 ASSURE       SERIAL         one accuracy check by one independent model
   [4 REPAIR]  bounded, one cycle
5 PRECHECK     OPTIONAL       informational scorecard, on request; gates nothing
6 RELEASE      HUMAN, always, unchanged
7 MERGE -> 8 WIRE -> 9 CONSUMER TEST -> 10 LINKEDIN
```

Serial everywhere else, including the writer. Parallel draft candidates judged against each
other was considered and cut: the expensive run's A and B were never competing candidates, they
were two different posts produced by a ceiling change, and both shipped.

**A note on WIRE, stage 8.** `SPEC.md` says an HTTP 200 is not proof of production adoption.
That is not caution, it is measured: this site currently answers 200 with the homepage for any
unknown path, so a status code proves nothing at all about whether a Note is live. Assert on the
Note's own content.

## 1. IMPLEMENT

Draft in `editorial/articles/<article-id>/DRAFT.md`. Build the page from the existing Notes
pattern; do not redesign Notes while publishing one.

**Length.** 700 **body** words maximum, hard requirement. Body means prose the reader reads: no
title, byline, source notes, or link URLs; link anchor text counts. State the method with any
count.

> *Failure this prevents:* two drafts were judged on different counting methods, so one was
> simultaneously "compliant" at 969 and "over" at 1,137. A cap ambiguous about what it counts
> is not a cap.

**If a draft exceeds the ceiling, do not trim uniformly.** Cut to one thesis and split the
rest into its own Note. A section that survives being lifted out intact was always its own
piece.

**Every surface that reproduces article copy must be updated together:** the page, the Notes
index card, the index `Blog` JSON-LD, `sitemap.xml`, and any derivative.

**Every new Note must also be reachable**, or Google may not index it. In `ryzalab-website`,
add the page to `PAGE_PROFILES` (`scripts/lib/site_header.mjs`, for the shared header and
footer) and to `BLOG_POSTS` (`scripts/lib/site_footer.mjs`, the "From the blog" footer line on
every page), then run `node scripts/sync_site_header.mjs`. Set the Note's sitemap `<lastmod>` to
the deploy date, equal to its BlogPosting `dateModified` (or `datePublished` if never modified).
`scripts/validate_publish.sh` runs `sync_site_header.mjs --check` and fails the build if a
published Note is missing from `PAGE_PROFILES`, `BLOG_POSTS` or `sitemap.xml`
(ryzalab-website `docs/GITOPS_AND_WORKFLOW.md`, "Search indexing after deploy").

> *Failure this prevents:* in October 2026 no indexed page linked any post, so the Notes sat
> "Discovered, not indexed" or "unknown to Google" while the sitemap was the only path to them.

> *Failure this prevents:* a repaired claim shipped corrected in the article and uncorrected
> in the index card, which is a live public surface, because the parity check swept only the
> article body.

---

## 2. TEST

```bash
python3 tests/test_embed_csp_contract.py     # application/CSP contract, scans every page
python3 -m pytest tests/test_qa_drift.py -q
```

If the Note embeds video, point the verifier at **that** Note. It defaults to the
technological-autonomy page and asserts that page's exact clip intervals, so running it bare
against a different candidate proves nothing about the candidate:

```bash
CLIP_PAGE=/notes/<slug> \
CLIP_VIDEO=<youtube-id> \
CLIP_EXPECT='[[<start>,<end>]]' \
  node tests/verify-clips.mjs
```

`CLIP_VIDEO` matters: without it the check asserts the intervals but not which video plays, so
a Note that copied the facade and kept a stale `data-yt` would pass. One clip is a valid
configuration; give as many pairs as the Note has.

Plus, on each changed page: em dashes, mojibake, non-breaking spaces, unbalanced or malformed
emphasis, placeholders, valid `BlogPosting` JSON-LD, self-consistent canonical and `og:url`,
resolving links, and tag balance.

**Founder-supplied drafts arrive damaged.** Expect mojibake, U+00A0 mid-sentence, orphan
hard-break backslashes, and emphasis that closes after a space so it runs into the next
sentence. Normalize before anything else, and disclose that hashes will not match the
supplied file.

**Write checks that can fail.** Prove it by mutation, not by reading the code.

> *Failure this prevents:* a facade test used a greedy regex that swallowed the whole document
> and reported `<a href>` targets as page loads. It passed while testing nothing.

### Baseline editor checklist

Runs on every Note, at this stage, before any Standards reviewer is invoked. The policy and its
coverage limits live in `policy/SPEC.md` under *Baseline editorial QA*; what follows is only
how to execute it. Every item is a command with an exit code or a question with a yes or no
answer. Run from the repo root. `<id>` is the article id.

**1. Machine decides. A failure here is a rejection, not a review finding.**

```bash
python3 scripts/precheck.py content/<id>             # in ryzalab-content; checks FINAL.md
bash scripts/validate_publish.sh                     # in ryzalab-website, on the rendered page
```

The body-word count is the one in `scripts/precheck.py` (`--count` prints only the number).
Report that number, never one from another counter.

The precheck owns US spelling for the variants on its list, prohibited dashes, placeholders and
claim markers, encoding artifacts, malformed emphasis, the body-word ceiling, and absolute
self-links. Do not argue with a FAIL: fix the draft and rerun until it exits clean. A WARN is a
question addressed to you, not a verdict: read it and decide. Both commands must run clean
against the **final** draft, not an earlier one.

**2. Machine suggests, you decide. AI-writing scan (blog-level since 2026-10-23).**

The precheck in item 1 already ran it and printed its top findings grouped by type as
`NOTE scanner` lines. To run it alone:

```bash
python3 scripts/vendor/humanizer/prose_scanner.py content/<id>/FINAL.md
```

Exit 0 is no error-severity findings, 1 is findings present, 2 is a usage error. **Exit 1 does
not block on its own, and a long finding list is not a rewrite instruction.** `SPEC.md` records
why.

- [ ] Skim the grouped findings and fix what reads as machine-written. No written disposition
      is needed and nothing here blocks (amended 2026-10-23 by Ryan; every finding used to need
      a written `fix` or `keep`). The readiness reviewer lists up to three more patterns as P3.
- [ ] Then read the draft yourself against the signs the scanner cannot count: inflated
      symbolism, promotional language, superficial -ing analyses, vague attribution such as
      "experts say", rule of three, AI vocabulary, negative parallelism such as "not only X but
      Y", and conjunctive phrase pileups. This half is the `/humanizer` skill, not its script.

**3. You decide. No machine exists. Spelling.**

No spell checker is installed on this machine: `aspell`, `hunspell` and `codespell` are all
absent. Anything outside the precheck's variant list is a reading task, so do the reading.

- [ ] Read the draft once for spelling alone, in a separate pass from reading it for sense.
- [ ] Every proper noun is spelled the way its owner spells it: person, company, product, venue,
      standard, protocol. Check against the source you cited, not from memory.
- [ ] Any British form the script does not carry, for example "licence" as a noun, "programme",
      "whilst", "sceptical", "modelling", is converted in house prose and left untouched inside
      a quotation.
- [ ] Homophones the eye skips over: its/it's, their/there, affect/effect, principal/principle,
      complement/compliment, discreet/discrete, lead/led.
- [ ] Numerals, units and dates match the source they came from.

**4. You decide. No machine exists. Grammar.**

- [ ] Subject and verb agree, including where a clause sits between them and the subject is
      several words back.
- [ ] Tense is consistent within each paragraph, and the choice of tense for a cited study or a
      recorded run is the same one throughout the Note.
- [ ] No dangling or misplaced modifier: whatever follows an opening participial phrase is the
      thing actually doing it.
- [ ] No comma splice: two independent clauses joined by a comma. Use a full stop, a semicolon,
      or a conjunction.
- [ ] Every pronoun has exactly one possible antecedent. A sentence opening with "it" or "this"
      usually does not.
- [ ] Parallel structure holds across every list and every pair joined by "and" or "or".
- [ ] A trimmed or clause-scoped quotation still parses as a sentence, and its attribution and
      punctuation survived the trim.

**5. You decide. Damage carried in from a supplied draft.**

The damaged-draft note above says what arrives broken and that normalization happens first.
Confirm by reading, because the residue survives matchers:

- [ ] No mojibake, no U+00A0 mid-sentence, no orphan hard-break backslash anywhere in the body.
- [ ] No emphasis span that closes after a space and runs on into the next sentence.
- [ ] The normalization was disclosed, since hashes will not match the supplied file.

**6. Close out.**

- [ ] Items 1 to 5 are done against the same final draft.
- [ ] Every precheck FAIL is fixed and every WARN has been read. Scanner `NOTE` lines need nothing.
- [ ] Only then invoke stage 3.

---

## 3. ASSURE

One accuracy check by one independent model, on the exact tested candidate, that did not draft
it. Only a factual error, a misrepresentation of a named company, brand, product or public person, a safety hazard, a broken offer or CTA, or a broken constraint block, as P0 or P1; tone, framing, word choice, a strongly worded opinion and style are
P3 suggestions (blog-level, amended 2026-10-23 by Ryan).

> **How to run it.** `python3 scripts/standards_review.py <content_id> readiness`. It runs the
> precheck, then sends `FINAL.md` with its claim ledger, constraints, offer text and the SPEC
> excerpts to a reviewer in a fresh session (codex; if that fails, composer; then Gemini), and
> saves the reply as `content/<id>/reviews/<time>-readiness-<model>.txt` with the file's sha256.
> The last line of the reply is `READINESS: PUBLISH`, `REPAIR` or `HOLD`. After the one repair
> cycle, write the repairs into a short file and run it again with
> `--rereview --repairs <file>`. The reviewer's lineage (the company behind the model) is
> recorded, because the optional scorer in stage 5 must come from a different one: codex and composer
> are both OpenAI, so after an OpenAI readiness the score comes from Gemini, and after a Gemini
> readiness from codex or composer. No CLI? `--print-prompts` prints the prompt to paste into your
> approved AI tool (drafts only, `policy/GOVERNANCE.md`); then save the reply and run
> `python3 scripts/standards_review.py <content_id> record readiness --sha <sha> --bundle <bundle> --reply content/<id>/<file> --model "<model>"`
> (the prompt printout gives the exact command, `<sha>` and `<bundle>`). The reply file must sit
> in `content/<id>/`. `--model` must name the model (gpt-5, o3, gemini, claude...): a record whose
> lineage comes only from `--lineage` is kept as self-attested and never unlocks scoring.
> Readiness is bound to its input bundle (FINAL.md plus every file the prompt included); if the
> ledger, constraints, offer, SPEC, voice guide or prompt changes afterwards, scoring refuses
> with "inputs changed since readiness". Review files carry an integrity line; do not edit them.
> The prompt lives in `policy/templates/review-prompts/readiness.md`. It carries the Note's
> `byline` and `author` from `note.yaml` as page metadata, so the reviewer checks the byline
> there, not in the body.

> **Founder acceptance (amended 2026-10-23 by Ryan).** When the reviewer keeps a finding open
> about wording Ryan wants kept, Ryan may accept it by finding id; Edie offers him the line, and he
> records it with `python3 scripts/record_line.py <content_id> CONSTRAINTS.md`:
> `FOUNDER DECISION: RYAN, <YYYY-MM-DD>; CONTENT_ID=<content_id>; ACCEPT_WORDING=<finding id>; REVIEW=<readiness record file name>; CLAIMS=<claim id>[,<claim id>...]; REASON="<reason>"`.
> Then run `python3 scripts/standards_review.py <content_id> release-check`. It writes
> `release_readiness: PUBLISH_FOUNDER_ACCEPTED` to `STATE.yaml` only when every open P0/P1 finding
> in the latest readiness record is accepted, each named claim is `VERIFIED`, `GREEN`, `OPINION`,
> `FIRST_PERSON` or `YELLOW_SOFTEN` in the ledger, the review's CLAIM CHECK marks no claim `FAIL`,
> the ledger has no unresolved fact (`NEEDS_SOURCE`, a `CUT` still in the text, or a legacy `RED_*`), and no open finding is tagged
> `[CLASS: MISREPRESENTATION]`; otherwise `NOT_READY` with the reason
> ([GOVERNANCE](GOVERNANCE.md#founder-acceptance-of-a-wording-finding)). Founder acceptance
> never clears either of the
> [two general controls every Note follows](GOVERNANCE.md#two-general-controls-every-note-follows):
> no misinformation and no misrepresentation of a brand or public person (amended 2026-10-23 by
> Ryan; they replace the legal, privacy and customer classes). The acceptance names the review file, so a new readiness run needs new lines.
>
> **Quote the sentence (D7, 2026-10-26).** The `REASON` also quotes the accepted sentence or
> heading between curly quotes, exactly as in `FINAL.md`; `record_line.py` refuses a new line
> without it. Edie offers Ryan the line with the sentence already in it, so the record never
> rests on a finding id alone.

Do not open this stage on a candidate whose *Baseline editor checklist* in stage 2 is
incomplete. An undispositioned scanner finding or an unread grammar pass is a stage 2 defect,
and spending an independent reviewer on it is the exact waste the deterministic floor exists to
stop.

For A/V, run the eight gates in `policy/SPEC.md` → *Video and audio provenance*. Two are
load-bearing:

- **Canonicalize channel URLs before comparing.** Organizations link legacy `/user/` URLs that
  do not string-match the handle serving the video.
- **Wording confidence is clause-scoped, not quote-scoped.** If press corroborates two clauses
  of a three-clause sentence, only those two may sit inside quotation marks. Trim, or bring the
  full span to Tier 4: two independent transcriptions of the first-party audio that agree word
  for word, with the timestamp recorded. A human listen is no longer required (SPEC V3,
  deprecated 2026-10-22).

**Never accept AI-summary output as corroboration.** It is circular, and it is the actual
contamination vector: a search summary was observed welding one event's quote onto another
event's venue during verification.

---

## 4. REPAIR

One bounded cycle. Repair only the failed scope. Order: `source → narrow → qualify → remove →
restructure`.

**After repairing, re-sweep every surface**, then re-run only the invalidated checks.

> *Failure this prevents:* trimming for word count silently deleted the article's thesis pivot,
> because the dek existed only in metadata and the body text looked like duplication.

---

## 5. EDITORIAL PRECHECK

**Optional and informational** (amended 2026-10-23 by Ryan). Run it when the writer or Ryan wants
a craft read. Nothing waits on it: it is not a release condition, `all` does not run it, and
`release-check` never reads it.

> **How to run it.** `python3 scripts/standards_review.py <content_id> score`. It refuses unless
> the exact current `FINAL.md` (by sha256) got `READINESS: PUBLISH`, or `release-check` gives
> `PUBLISH_FOUNDER_ACCEPTED` on it (stage 3). The scorer is a fresh
> session from a different model lineage than the readiness reviewer and sees only the article
> and SPEC's scorecard text, never earlier reviews. The script adds up the weighted score
> itself, saves the reply under `reviews/`, and appends the entry to `STATE.yaml`
> `scorecard_log`; you fill in nothing but a note if one is needed. Add `--scorers 2` to get a
> second blind score, from a lineage other than the first scorer's, when the first lands within
> 3 points of 80. A reply whose own total is more than 1 point off the recomputed one, or that
> states no total, is logged `SCORE_MISMATCH` and is not a pass until it is run again. Without
> a CLI, use `--print-prompts` and `record score`, in an AI from a different company than the
> readiness one.

Score against `policy/SPEC.md` → *Editorial scorecard*, with an editor that did not write
or fact-check the piece. Read the last entry in `STATE.yaml`'s `scorecard_log` for the score to
beat, append this run as a new entry, never overwrite a prior one.

**When a score was run, a replacement that scores below what is already live is worth saying
out loud**, even if it clears the absolute threshold. It is information for Ryan, not a gate.

> *Failure this prevents:* a revision cleared every PUBLISH threshold at 82 while replacing a
> live 87, having relocated rather than destroyed its distinctiveness. One restored sentence
> closed most of the gap.

---

## 6. RELEASE HITL

One founder decision: `APPROVE RELEASE | REVISE <dimension> | REJECT/HOLD`.

Do not mutate the candidate after approval. If something must change at merge, such as
removing `noindex`, do it **before** the packet and prove the change was scope-limited:

```bash
# reinsert exactly what was removed; the hash must return to the approved one
```

---

## 7. MERGE

```bash
git fetch origin main
git checkout -b <branch> origin/main
git add <explicit paths>            # never -A
git diff --cached --name-only       # must equal the intended set exactly
```

`editorial/articles/` stays uncommitted. The Cloudflare publish directory is the repo root and
committed `.md` files are served publicly; `ryzalab.com/docs/RISK_LEDGER.md` returns 200 today.
Committing the per-article trail publishes standards reports and scorecards to the live domain.
`policy/SPEC.md` is tracked, because a policy nobody can retrieve is not a policy.

**Wait for the independent reviewer before merging.** CI green is two of the three conditions,
not three.

> *Failure this prevents:* PR #79 merged at 17:05:52Z. The reviewer posted a valid P2 at
> 17:06:45Z, 53 seconds later. The next PR waited, and the reviewer found three real defects,
> all of them in the tests written to prevent defects.

**A bot comment is not the closeout.** `scripts/qa_merge_gate.py` lists
`chatgpt-codex-connector[bot]` in `BOT_LOGINS`, so a connector review alone never closes a PR.
The closeout is a head-bound `QA-RESULT` / `QA-BY` comment naming an exact-head independent
review from a family other than the author's, posted after the latest finding. No tier needs it
to come from a second GitHub account: `ryzalab-platform` retired `ryzalab-qa` as a mandatory
attestation hop (`GOAL-autonomous-agent-arch.md`, "Done when"; `scripts/merge_pr.sh`, policy
1.1.0), and this repo follows it. Post the closeout from the working account; do not switch the
machine's active `gh` account to `ryzalab-qa` to do it. What stays: deterministic checks,
exact-head independent review, a disposition for every finding, and Ryan's approval wherever a
tier requires it. Blocked work (publishing, any public post) additionally needs Ryan's
authorization carrying a rollback plan and production or staging evidence.

Order is: CI green, every finding dispositioned, **then** the closeout, then Ryan's approval
where required.

**The closeout schema lives in `scripts/qa_merge_gate.py`. Read it there; do not copy it from
here.** `scripts/closeout.py` builds a self-attested closeout with the gate's own functions and
checks it before posting ([PRs and the merge gate](#prs-and-the-merge-gate)). It is more than a few markers: risk tier, per-finding disposition lines in a fixed
four-field form, separate handling for each QA stream, and an additional human-approval block
at the Blocked tier. Three successive attempts to summarize it in this runbook were each
incomplete in a different way, which is the argument for pointing rather than restating. Any
push invalidates a head-bound closeout and requires a fresh one.

**The gate is advisory, not off.** `.github/workflows/qa-merge-gate.yml` runs in audit mode
unless `QA_GATE_ENFORCE=true`, and branch protection must separately require the check.
Configuring a distinct reviewer identity alone does not make the repository blocking, so do not
read a passing or skipped gate as proof the closeout happened.

Note the two reviewer streams: `qa-lens` (gemini) posts fast and labels itself *"Cross-family
review input (not the merge attestation)"*; `chatgpt-codex-connector` is slower and raises the
real findings. Distinguish a **new** finding from one GitHub re-anchored to a later commit:

```bash
gh api repos/surencio/ryzalab-website/pulls/<N>/comments \
  --jq '.[] | "\(.original_commit_id[0:10]) \(.path):\(.line)"'
```

`original_commit_id` is the truth. `commit_id` moves.

---

## 8. WIRE

**HTTP 200 is not deployment proof.** The site soft-404s unknown `/notes/*` paths by serving
the homepage, so a status check passes against the wrong page.

Prove by content:

```bash
curl -s -L -A "$UA" "https://ryzalab.com/notes/<slug>?cb=$RANDOM" | grep -o "<title>[^<]*</title>"
```

Then verify the article body hashes identically to the merged candidate, and confirm the index
card, index `Blog` schema, sitemap entry, cross-links, and CTA. Expect CDN lag between the
article and the index; re-poll cache-busted rather than concluding the index is broken.

Production differs from the candidate by Cloudflare's email obfuscation and analytics
injection. Compare the `<article>` body, not the whole file.

**A change to a published Note (2026-10-23).** When the change alters substance (a factual
correction, a restored or removed passage, a changed claim or conclusion), add one line at the
end of the body, before the source notes, in the same content and website PRs as the change:
`*Updated <Month D, YYYY>: <what changed, in one plain sentence>.*`, and set the page's
`dateModified` to that date. Typo, formatting and link fixes get neither. WIRE then also proves
the note and the new `dateModified` are live. `precheck.py` leaves the note out of the word count
only when it is the one such line, the last body line before the source notes, and one sentence
of at most 30 words; a second or misplaced note fails precheck
([SPEC: Corrections and updates](SPEC.md#corrections-and-updates)).

**Then get it indexed.** Deployment proof is not discovery.

1. **Sitemap.** The agent running post-deploy verification resubmits the sitemap with
   ryzalab-platform `scripts/gsc_submit_sitemap.py`, which submits only when `sitemap.xml`
   changed. Record its JSON line.
2. **Request Indexing (founder).** In Search Console, run URL Inspection on the new Note's URL,
   then Request Indexing. Google offers no API for this step.
3. **Re-check after a few days.** Use the read-only URL Inspection and record the coverage state
   in the piece's state. If it still says "Discovered, not indexed", the levers are links from
   other sites and the LinkedIn distribution, not another resubmission.

---

## 9. CONSUMER TEST

A fresh reader against production: find it from the index, read it, follow a source, identify
the CTA. Ask what it argues, what they would remember, what action is wanted, and what
sentence reduced trust.

Style preference is not a defect. A 403 from a bot-blocking publisher is not a broken link.

---

## Team handoff in Google Drive

Apply this routing whenever delivering drafts or selected final copy and images. The repo remains
the working source and the calendar remains the only schedule. Drive is the team's handoff location.

Base folder: `My Drive/01. RyzaLab/000_RyzaLab_Ops_Docs/Employees/RyzaLab - Sunny.LeAnn/05 Content`
(`1vO3I4yeHX6h4r0I2i41M7_r6Zyhg2IS4`). The `G:` prefix is the Windows mount, not a Drive API path.
These folders were resolved on 2026-10-22:

| Asset | Folder below the base | Drive folder ID |
|---|---|---|
| Selected final blog copy and matching final image | `Blog/FINAL` | `1brlgi-9onG5A-xY9PxdZez1Jvga2hjBI` |
| Blog drafts, draft images and superseded versions | `Blog/Drafts` | `1tIec4mM6Ysj1YZK5fn8xD0VSHGPYW6-K` |
| Selected final LinkedIn teaser and matching final image | `LinkedIn/FINAL` | `10HmzXyiMS1ijBe5KxTBqlSEnPmbHOXIP` |
| LinkedIn drafts, draft images and superseded versions | `LinkedIn/Drafts` | `1BPuAUXLTvwfTzhQ5VTCD4rf6nsJuQXDS` |

Reuse the existing plural `Drafts` folder for LinkedIn; do not create a second `Draft` folder.
For each handoff:

1. Identify the `content_id`, asset role, exact version and destination. Keep copy and its matching
   image identifiable together. Report a missing image or teaser and complete the available assets.
2. Preserve the reviewed Markdown bytes and SHA256. Record the source hash and current editorial
   status in the Drive description or the piece's existing handoff state. A Docs or PDF conversion
   is a derivative and does not inherit the Markdown file's checksum.
3. Reuse the recorded Drive file ID. Skip an identical file already in the correct folder; move it
   when only its destination changes; update it when its content changes. If no file ID is known,
   check the destination for the same content, asset and version before creating a new file.
4. Preserve earlier drafts and mark superseded files clearly. Do not delete them when handing off
   a selected final. Keep source history and unrelated folder parents or permissions intact.
5. Read back the file metadata to verify its name, parent folder and available checksum or revision
   details. Record the actual Drive file ID and link, then report completed and missing assets.

`FINAL` means the selected handoff version, not publication approval. Filing a candidate there does
not change its G1 decision, readiness verdict, scorecard, calendar status or posting authorization.
An approval or score on an earlier hash does not carry forward to a changed candidate. The existing
release and posting rules still apply.

## 10. LINKEDIN

Derived from the fact-locked Note. No new external factual claim.

Every post CTA follows [offer.md](offer.md): no price unless an explicit recorded `FOUNDER DECISION`
authorizes an exception covering that post. The same default applies to blog and other channel CTAs.

- **LinkedIn renders no markdown.** `**bold**` posts as literal asterisks. Strip it.
- **Formatting is Unicode, used sparingly.** Bold a short lead-in label or section line with
  Unicode sans-serif bold (𝗦𝗵𝗮𝗱𝗲𝘀); never a whole sentence, because screen readers spell those
  characters out. One emoji per list item at most, for a how-to; none for a design-trade piece.
- **End the post the same way every time:** two relevant hashtags, a blank line, an optional
  one-line lead-in, then the `ryzalab.com/n/<code>` link as the last line with nothing after it,
  so LinkedIn shows the
  Note's preview card. The card's image is the Note's `og:image`, so the Note's own header and
  social image must be live before the post goes out.
- **The first line may be the Note's title** when the title works as a hook (a joke, a question
  or a claim), not when it is a plain label. LinkedIn's link card repeats the Note's `og:title`
  under the post, so the opener and the card show the same words (Ryan, 2026-10-23).
- Point the link at the Note that actually contains what the post promises.
- Save draft teasers and images to `LinkedIn/Drafts`, and selected final versions to
  `LinkedIn/FINAL`, using the [Google Drive handoff](#team-handoff-in-google-drive) above.
  Keep the `YYYY-MM-DD_LinkedIn_<slug>.md` naming convention and record the stable `content_id`.
- When a Note is split or retitled, mark superseded drafts `SUPERSEDED_` rather than deleting.

> *Failure this prevents:* a drafted post enumerated five questions and linked to an article
> that, after a split, no longer contained them.

Check it:

> `python3 scripts/linkedin_check.py <content_id>` checks the post in `LINKEDIN.md` (the text
> between the first two `---` lines) against `distribution.yaml` and `note.yaml`: at most 3,000
> characters, no markdown, exactly one link and it is `ryzalab.com/n/<code>` alone on the last
> line, a valid `distribution_id` with matching `utm_id` and short code, exactly two hashtags on
> one line before the link, bold only in labels of 6 words or fewer, and at most one emoji per
> line. A `READY_FOR_LINKEDIN_PUBLISH` row must also carry the exact tagged link that
> `scripts/distribution_link.py` builds. Add `--live` once the website has the short link: it
> confirms `/n/<code>` answers 302 to that exact link with `cache-control: no-store` (TEST_PLAN
> T21). All `PASS` and `RESULT PASS` means the copy is ready for Ryan; any `FAIL` names what to
> fix. Every PR runs it on a changed `LINKEDIN.md`.

**Posting is a separate authorization.** Terminal state is `READY_FOR_LINKEDIN_PUBLISH`.

**Placement.** The post goes out on the RyzaLab Company Page. Ryan's plain repost from his
personal profile needs no new `distribution_id`; its clicks go through the Company Page post's
`ryzalab.com/n/<code>`. A personal post with its own text and link is a separate Distribution
(founder decision 2026-10-23).

### The link, and the experiment it belongs to

Announcing a Note is a distribution experiment, not a separate process, so it runs from here.
`policy/media/STANDARD.md` section 8 owns the ids and the link rule; this is the procedure.

**When a post contains a link, its only link is `ryzalab.com/n/<code>`.** It is a first-party
short link that answers `302` with the fully tagged Note URL. The last LinkedIn post used
`ryzalab.com/n/applelg` (21 characters). LinkedIn rewrites visible links over about 25
characters to `lnkd.in`, which hides the domain from the reader and the tags from us; a `/n/`
link stays under that, keeps the tags on the destination in a reviewed website table, and lets
a wrong destination be fixed without editing the post. Never post the long URL or an `lnkd.in`
link.

The tagged destination, for every channel:

```
<canonical_url>?utm_source=<channel>&utm_medium=<medium>&utm_campaign=notes&utm_content=<content_atom>&utm_id=<distribution_id>
```

- `<canonical_url>` is the URL the website release confirmed for the Note, not a slug guessed
  here. The Note's URL can change; its `content_id` and every `distribution_id` do not.
- `<medium>` is `social` for LinkedIn, Reddit and Facebook and `email` for Kit.
- `distribution_id` (= `utm_id`) is `<channel>-<yyyymmdd>-<short>-<nn>`, chosen before posting,
  for example `linkedin-20261008-applelg-01`. It is the unique key that joins the post to its
  landing and its ledger row.
- `utm_content` is the content atom, the angle argued, never the slug and never an id. It
  describes the post; it is not a key. Two Notes can share an angle, and one Note can be posted
  twice on different angles.

Build it with `scripts/distribution_link.py` (or the Notion **Tagged link** formula), never by
hand. Every piece needs `content/<content_id>/note.yaml` before its link can be built: the
script reads it and refuses to print a link unless its `attribution_short_code` equals
`--short-code`. For the live example it prints exactly the destination `/n/applelg` serves.
`apple-smart-home-lg` has no folder in this repo, so the example points `--notes-root` at the
test fixture note:

```bash
python3 scripts/distribution_link.py --utm-id linkedin-20261008-applelg-01 --channel linkedin \
  --content-id apple-smart-home-lg --short-code applelg --atom apple-lg-before-you-buy \
  --canonical-url https://ryzalab.com/notes/apple-smart-home-lg \
  --notes-root tests/fixtures/content
```

**Before posting:** one `ryzalab-website` PR adds the `/n/` code to `SHORT_LINKS` and, for a
Note's first post, the Note's entry (`content_id`, `canonical_path`, `legacy_paths`,
`attribution_short_code`) to `functions/_content_routes.js`. `DISTRIBUTION_SHORT_CODES` is
derived from that registry now, so it is not edited by hand (`docs/PUBLISHING_HARNESS.md`
section 8 has the steps). One gap there, for the website to fix: its step 1 command omits
`--short-code` and `--canonical-url`, which `scripts/distribution_link.py` requires; use the
full command above. The code is allocated on its own, not built from `<short>` and `<nn>`
(STANDARD section 8). Then check it against TEST_PLAN T21 and run LinkedIn Post Inspector on
the short link:

```bash
curl -sI https://ryzalab.com/n/<code> | grep -i -E '^(HTTP|location|cache-control)'
# 302, location byte-equal to the tagged destination, cache-control: no-store
```

A code that does not pass is not ready to post.

Verified rather than assumed: the tagged URL serves
`<link rel="canonical" href="<canonical_url>">` with the parameters stripped, so it consolidates
to the clean URL in search. The Note pages capture `utm_*` first-party into `ryz_attrib2` and
pass it to the Cal.com booking, so a tagged visit that becomes a consult stays attributable.

**Append the observation row when the post actually goes live**, not when the draft is ready.
One row per distribution in `ryzalab-platform`'s
`docs/experiments/data/editorial_observations.jsonl`, in the existing 14-field schema, carrying
the hypothesis line from the intake lock into `evidence_source` so the row can later be judged
against what was predicted. Performance fields start `[NO DATA]` and are filled on a later pass.
Two ids, not to be confused: the ledger's `distribution_key` is this repo's `distribution_id`
(the same value as the link's `utm_id`, chosen before posting); the ledger's older
`distribution_id` field holds the post URL recorded after posting, which this repo calls
`platform_post_url`.

> *Failure this prevents:* the first post went out as an `lnkd.in` link, which answers 403 to
> anything but a browser, so its tags could never be checked and its ledger row still reads
> `utm_content: [NO DATA]`. This file then called the `lnkd.in` URL the ID while the media
> standard called `utm_id` the ID, two rules for one link.

---

## Embedded video

Only if the Note needs it.

- Use `youtube-nocookie.com`, `start`/`end` for bounded clips, and a click-to-load facade.
- **The facade must fetch nothing from the platform**, including the poster. `i.ytimg.com` is
  a Google origin; a remote thumbnail defeats the point.
- **Add the origin to CSP `frame-src`.** `default-src 'self'` blocks third-party frames
  outright, and a generic CSP scanner will not flag it, because a missing `frame-src` is a
  restriction rather than a vulnerability. `tests/test_embed_csp_contract.py` is the control.
- Quote the passage as text above the player so the argument survives the video being blocked.
- Do not claim "zero cookies." Say: no request occurs before interaction; after interaction
  the player uses Privacy-Enhanced Mode.
- Do not adopt `lite-youtube-embed`: it loads `youtube.com/iframe_api` on Apple and mobile,
  which `script-src` forbids, so it fails silently on Safari and every phone.

> *Failure this prevents:* the first player shipped functional-looking and completely blocked.
> The second removed both clip controls once either was pressed.

---

## State

`editorial/articles/<article-id>/STATE.yaml`: lifecycle, exact hashes, commit, release verdict,
production URL, consumer result. A snapshot, not a log, with one deliberate exception:
`scorecard_log` (`policy/SPEC.md` → *Scorecard log*), append-only, because the replacement-
candidate diff rule needs a prior scorecard's exact evidence sentences sitting in one
predictable place, not scattered across ad hoc filenames the way the expensive run left them.

STATE.yaml is also the resumability anchor for the front end above: a run interrupted after the
intake lock resumes by reading the lock and the hypothesis back out of it, not by re-running
0-INTAKE from scratch. That is most of the point of locking at intake rather than discovering
constraints later. A lock is resumable state; a constraint that has not been written down yet
is not.

---

## Metrics and hypothesis, wired to the existing ledger

No new schema. Before stage 1 starts, the intake lock carries a hypothesis line alongside the
thesis, in the same H1/H0 shape `EXP_GTM_EDITORIAL_ACQUISITION.md` already uses. It is not
graded at intake. It exists so the eventual observation row is judged against what was actually
predicted rather than reverse-fit afterwards. After stage
10 (LINKEDIN) reaches `READY_FOR_LINKEDIN_PUBLISH` and is actually posted, append one row to
`ryzalab-platform`'s `docs/experiments/data/editorial_observations.jsonl`, in the existing
14-field schema (`distribution_id`, `content_id`, `published_at`, `distributed_at`,
`content_atom`, `canonical_url`, `utm_content`, `impressions`, `external_link_visits`,
`qualified_leads`, `booked_consults`, `attributable_revenue`, `measured_at`, `evidence_source`).
`content_atom` names the angle actually argued (per this ledger's own precedent:
`autonomy-not-privacy-reframe`, not a restatement of `content_id`); the intake hypothesis line
carries into `evidence_source` so a later reviewer can check the row against what was predicted.
Validate the append the same way this session validated every row change to that ledger:
`python3 scripts/validate_experiments.py` plus a field-count/order check against the schema
above: reuse that check, do not write a second one.

### Founder time, from the session transcript

Closeout step, run by the operator once the piece's PR has merged (or with `--window-end` while
it is open). Ryan is never asked how many minutes a piece took (founder decision 2026-10-18);
the figure comes from the session transcript or it is `[NO DATA]`:

```bash
python3 scripts/founder_time.py <content_id> --transcript <session.jsonl> --pr <N> --cycle-class calendar_ai --distribution-id <distribution_id> --activity "<what the cycle was>"
```

The transcript is the Claude Code session file under `~/.claude/projects/<worktree-slug>/`.
The script fetches `/home/ryang/repos/ryzalab-platform-main` and checks out `origin/main`
detached, runs the platform's `scripts/task_metrics.py --runtime claude` bounded by the PR's
lifetime, and appends one entry to `founder_time_log` in the piece's `STATE.yaml`
(append-only, oldest first, like `scorecard_log`). Each entry carries
`operator_turns_additional`, `operator_latency_exposure_s`, `gap_ceiling_s`,
`transcript_sha256` and `confidence: estimated_upper_bound`. Anything `task_metrics.py` cannot
measure is `[NO DATA]`, never 0. `cycle_class` is `manual_baseline` for a cycle run the old way
and `calendar_ai` for one run through the calendar and agents. The first three Notes captured
are marked `baseline: true`, and nothing earlier is backfilled.

**Founder decision (Ryan, 2026-10-23): founder minutes count only when derived from system log data points (session transcripts); never self-reported; no log data means [NO DATA].** `task_metrics.py` measures exposure,
not effort: `operator_latency_exposure_s` is wall time with the ball in Ryan's court, each gap
capped at `gap_ceiling_s`. It is an upper bound on the time his attention was needed, not the
time he spent. Every entry stays `confidence: estimated_upper_bound` and no entry is read as
minutes worked.

---

## Evals for the harness itself

Not "did this post do well": the ledger answers that over weeks. "Does this front end actually
work, before trusting it with a real idea": Every eval below tests a mechanism that exists, and
each one names the answer it must produce, because a check nobody has seen fail is not a check.

Evals 1, 2, 5 and 6 are replayable today against artifacts already in `editorial/articles/`,
with the right answers already known. That makes them the cheapest real evidence available and
the place to start.

1. **Provenance trigger fires at Lock 2, which is the hard case.** Replay the
   technological-autonomy Note's originating idea. Its v1 deliberately carried no direct quote,
   so the Lock 1 mechanical test does not necessarily fire: an outside review made exactly this
   point against an earlier draft that claimed the question was answerable before research. The
   eval is therefore whether the ledger-driven half fires at Lock 2, on a claim whose wording
   depends on recorded speech. It must. Late discovery of this one question was the single
   largest avoidable cost in that run.
2. **Provenance trigger does not over-fire.** An idea characterizing a public figure's position
   from a written press release or written testimony. Neither half of the trigger should fire. A
   trigger that fires on everything routes every piece into the most expensive gate set and will
   be switched off within a month.
3. **Locks hold, and the right one binds.** Attempt a ceiling change after drafting: re-intake.
   Attempt a ledger change after drafting: re-gate. The expensive run's ceiling moved mid-run and
   that is what forced its split.
4. **Ledger admits nothing unsupported.** A claim resting on a single anecdotal forum post,
   presented as general proof: reuse `policy/QUALIFICATION.md` Test C's own seed pattern
   rather than inventing one. At intake it must be pre-registered `RED_REMOVE` or routed to
   research, never admitted to the lock as supported.
5. **Deterministic floor, mutation-proved.** Seed a fixture with each real escape: mojibake, a
   non-breaking space, a malformed bold span, a stray backslash, an absolute self-link, and the
   British spelling that reached production. Every one must FAIL `scripts/editorial_precheck.py`.
   The script's `--self-test` flag exists for exactly this and should be run in CI.
6. **Floor does not over-fire.** A quoted British source legitimately spelling "colour" inside a
   blockquote must not FAIL. Over-firing on quotations is how a spelling check gets disabled,
   which is worse than not having one.
7. **Replacement diff catches the regression.** Replay `DRAFT_v2` against the incumbent's
   scorecard. It must report the dissolved numbered questions and the deleted against-interest
   sentence before any new test, standards or scoring work is commissioned. Known answer: that
   candidate scored 76.00 against a live 87.00, and all three review artifacts were spent before
   anyone knew.
8. **Reviewer-evidence rule discounts an unopenable artifact.** Replay the adjudication. The
   permissive verdict rested on a participant-published transcript another reviewer could not
   open. The rule must flag it for independent checking rather than adopting it. Known answer:
   direct checking found the transcript did not exist.

**Instrumentation and throughput.** Every stage logs start and end. Score distribution, how
often the provenance trigger fires, how often the floor rejects before a reviewer is invoked,
and time to publish become a small KRI set, mirroring `governance_cost_ledger.jsonl`'s pattern
on the platform side rather than inventing a new one. The floor-rejection rate is the one that
tells you whether this refactor actually paid: every rejection there is a human grade review
that did not have to happen.

**Boring but load-bearing, from the adversarial challenge on an earlier draft:** idempotent
per-stage logs, resumable interrupted runs (via `STATE.yaml`, above), consistent artifact
naming, ledger-append validation before any write (above), and an evidence-packet schema check
between 0-RESEARCH and stage 1 so a malformed packet fails loud there instead of surfacing as a
confusing failure three stages later. These are how a harness stops being an oral tradition
that only works when the same person runs it.

## Deliberately not built here

- **A SKILL.md invocation entrypoint.** This is a repo-specific process with tracked policy
  docs, not a cross-repo reusable skill; the existing pattern (runbook + SPEC.md) fits better
  than a slash-command wrapper would.
- **A running multi-agent Workflow.** The topology above is written so it can become one
  directly: the parallel/serial shape maps onto pipeline and parallel stages without
  translation: but authoring and running one needs its own explicit opt-in, which is a
  separate decision from this design being sound. Draft script is a follow-up, not bundled in
  sight-unseen.
- **A per-stage time budget.** The earlier tier table's 10-15 minute figure is withdrawn and
  not replaced: it was invented before a single measured run, which is the fabricated-threshold
  pattern this desk's own KILL-rule precedent on the `ryzalab-platform` side refused to accept.
  The two-hour target is a different thing and it does survive, scoped, above. A business
  constraint with a measurement plan and an exit rule is a commitment worth keeping; a
  per-stage number with neither is decoration. Instrument first, then set the rest.
- **Risk tiers.** Settled 2026-10-02: SPEC uses the platform's `draft` / `confirm` / `blocked`
  tiers, mapped in `policy/GOVERNANCE.md`. The old `E0/E1/E2` labels are retired; the templates
  now record the tier and any escalation (named-company claim, customer anecdote, security
  disclosure) instead.
