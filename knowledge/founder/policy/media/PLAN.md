# PLAN: RzL Media Editorial Calendar Pilot

**Status:** Adopted 2026-10-02 as v0.2 (from the 2026-09-29 v0.1 handoff)  
**As of:** 2026-09-29  
**Parent experiment:** `EXP-GTM-editorial-acquisition`  
**Child experiment:** `EXP-GTM-media-calendar-pilot`  
**Pilot duration:** 8 weeks

## 1. Decision to inform

Should RyzaLab continue investing founder + AI + collaborator time in a multi-channel investigative media calendar, and which channel/content-type combinations deserve continued effort?

The pilot is not intended to prove causal revenue uplift from content. It is intended to establish whether the system produces credible business and audience signals at acceptable founder cost.

## 2. Hypotheses

### H1: media/acquisition

A consistent stream of evidence-led investigative content and channel-native distribution will produce measurable movement from attention into owned audience, qualified conversations, booked consultations, and eventually attributable revenue.

### H0

The work produces impressions or engagement but little or no movement into owned audience or qualified commercial intent.

### H2: operating leverage

A shared editorial calendar plus bounded AI assistance will reduce active founder coordination time on a comparable repeated publication/distribution workflow without weakening editorial quality or authority controls.

### H0-ops

The calendar/AI layer adds process and maintenance without reducing founder effort or improving accepted output.

## 3. Baseline first

Before judging H2:

1. measure at least 3 comparable manual publication/distribution cycles if valid recent measurements do not already exist;
2. record active founder minutes, not elapsed agent/runtime time;
3. include review, clarification, corrections, logging, and rework;
4. keep the task class comparable.

Do not backfill a guessed founder-time baseline.

## 4. Pilot cadence

Default operating week:

| Day | Work |
|---|---|
| Monday | Signal Desk: review current research, product changes, investigations, filings, and prior-story follow-ups; select no more than two content atoms. Reddit contribution, field note, or source request where a relevant community exists |
| Tuesday | LinkedIn post 1: reporter note or original finding |
| Wednesday | LinkedIn post 2: explainer, field test, or follow-up from the week's atoms |
| Thursday | LinkedIn post 3. In Note weeks (every other week), publish the RyzaLab Note and make post 3 its derivative; otherwise an Explainer, Follow-up, or Signal derivative |
| Friday | Send `RzL Signal` in Kit; distribute selectively to Facebook |
| Ongoing | Respond to substantive comments, source leads, and time-sensitive developments |

The calendar manages planned work. It does not force publication when reporting is not ready.

**What the two-atom cap counts.** The Monday cap applies to newly researched content atoms only.
Three LinkedIn posts a week come from at most two atoms; one atom can carry several native
derivatives. Kit's lead story reuses that week's atoms, and its three `SIGNAL` items are limited
to analysis already done that week or earlier, so the Kit issue adds no new research load.

## 5. Eight-week operating targets

These are workload targets, not success metrics:

- 4 RyzaLab Notes or equivalent original/follow-up reporting pieces
- 24 LinkedIn Company Page distributions (3 a week); Ryan's plain reposts are not counted separately
- 8 Kit broadcasts
- 8 useful Reddit original contributions
- up to 8 Facebook distributions
- substantive comments/replies when they improve reporting or relationships

A `SIGNAL` can replace a scheduled derivative. Do not exceed the workload merely to hit a count.

## 6. Content-mix target

Use as a planning balance, not a hard quota:

- 25% investigations/follow-ups
- 25% signals/annotated external reporting
- 20% explainers
- 15% field tests
- 15% action briefs/community-oriented utility

If current news or reporting evidence makes a different mix rational, record the change rather than force the allocation.

## 7. Hard pilot metrics

### Primary

- attributable media revenue
- qualified editorial leads
- booked consultations

### Leading

- owned-intent events such as external-link visits, Kit clicks, newsletter replies, and explicit "I found you through..." conversations
- net Kit subscribers
- substantive inbound conversations
- channel-native attention with denominators

### Efficiency

- active founder minutes per accepted content atom
- active founder minutes per completed distribution cycle
- active founder minutes per qualified editorial lead, when a lead exists

## 8. Decision rules

### SCALE

Scale the media calendar when either:

A. at least 1 paid Blueprint or larger engagement is credibly attributable to Media; or

B. at least 2 qualified editorial leads and at least 1 booked consultation are credibly attributable to Media, with evidence that owned audience or owned-intent signals are also moving.

A single paid outcome is strong positive evidence but is not proof that every channel works.

### ITERATE

Iterate when revenue is still absent but at least one of the following is repeatable:

- qualified/high-intent conversations;
- owned-site or Kit movement;
- useful source/community acquisition;
- a clear content-type/channel pattern worth another bounded test.

Change the weakest variable, not the entire system.

### REDUCE A CHANNEL

After at least 8 genuine distributions on a channel, reduce it to monitoring/opportunistic use if all three are true:

1. zero owned-intent events attributable to that channel;
2. zero qualified conversations;
3. zero meaningful research/community value.

This is a proposed investment limit, not an industry benchmark.

### REASSESS / NO-GO

After 8 weeks, reconsider the calendar strategy if:

- zero qualified editorial leads;
- zero booked consultations;
- negligible owned-audience movement;
- no meaningful research/community value;
- and the operating layer does not reduce founder effort.

### OPERATING-LAYER CONTINUATION

Promote the calendar/AI workflow beyond pilot only if measured active founder/expert time on a comparable repeated workflow improves by at least 25%, or a founder-approved quality-first exception is predeclared before results.

Guardrails must remain intact.

## 9. Instrumentation

### Calendar

The Notion calendar (MEDIA_SPEC 8.2, 8.3) captures planned dates, content type, content atom, source trigger, owner, status, one row per post with its `distribution_id` and tagged link, and the measurement checkpoint. The Grok assistant checks it weekly and drafts the plan; it does not publish.

It does not become the claim ledger or experiment ledger.

### Existing experiment ledger

Register `EXP-GTM-media-calendar-pilot` in:

`ryzalab-platform/docs/experiments/experiments.jsonl`

Record:

- H1/H0
- parent experiment
- business outcome
- primary metrics
- founder-time metric
- evidence sources
- decision at pilot close

### Existing LinkedIn observation ledger

Continue event-level LinkedIn observations in:

`ryzalab-platform/docs/experiments/data/editorial_observations.jsonl`

### Other platform evidence

For Kit, Reddit, and Facebook during v0:

- capture native analytics screenshots/exports/IDs where available;
- record measurement date;
- preserve denominators;
- cite those evidence artifacts from the child experiment checkpoint.

Do not treat missing telemetry as zero.

## 10. Work sequence

### Phase 0: adopt scope

Status at 2026-10-02:

- merge the Media scope delta into canonical editorial policy: done by reference (`policy/SPEC.md`
  points here; this package is the Media layer);
- add the calendar operating fields: done (Notion Content and Distributions databases);
- register child experiment: proposed in `ryzalab-platform` PR #417, pending merge;
- create the Grok weekly check: built (`ryzalab-automation` PR #24), not yet running; it needs a
  valid Notion integration token and an xAI key;
- brief Sunny on investigative reporting and AI boundaries: open (README and issue #1 are the brief).

### Phase 1: baseline

- record manual founder effort for comparable cycles;
- confirm current channel access and metrics availability;
- do not invent missing historical data.

### Phase 2: run 8 weeks

- research no more than two primary atoms in a normal week;
- use existing evidence locks;
- distribute natively;
- measure at fixed checkpoints.

### Phase 3: disposition

Return:

`SCALE | ITERATE | REDUCE_CHANNEL | NO_GO | INCONCLUSIVE`

Also return:

- revenue / lead / consultation evidence;
- channel-specific owned-intent evidence;
- founder-time comparison;
- editorial guardrail performance;
- one next action.

## 11. Non-goals

- no custom calendar app;
- no autonomous posting bot;
- no bulk AI content generation;
- no new content governance stack;
- no new analytics warehouse;
- no fake A/B testing at tiny sample sizes;
- no requirement to publish on every channel every week if the reporting does not support it.
