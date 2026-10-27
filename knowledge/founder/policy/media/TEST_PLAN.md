# TEST PLAN: RzL Media Editorial Calendar

**Status:** Adopted 2026-10-02 as v0.2 (from the 2026-09-29 v0.1 handoff)  
**As of:** 2026-09-29  
**System under test:** Media scope + investigative workflow + shared editorial calendar + multi-channel distribution + measurement

## Acceptance principle

The pilot passes only if the new scope increases useful editorial/distribution capability without creating a second governance system, weakening evidence gates, or hiding founder cost.

## T1: Canonical reuse

**Test:** Confirm adoption is expressed as deltas to existing canonical editorial files and experiment infrastructure.

**Pass:** no new competing editorial governance stack.

## T2: Scope separation

**Test:** Review policy language for commercial-brand/editorial-scope conflation.

**Pass:** RyzaLab brand constraints still govern claims about RyzaLab services, while Media can investigate technology, cybersecurity, consumer rights, surveillance, privacy, and the internet broadly.

## T3: Evidence-first reporting

**Test:** Select one pilot investigation.

**Pass:** no publication prose exists before Lock 2; the thesis reflects the research that landed.

## T4: Timeliness

**Test:** Inspect each current-story PLAN.

**Pass:** at least one specific dated current trigger is present, normally within the previous 12 months, unless the PLAN explains why historical material controls.

## T5: Countercase

**Test:** Inspect thesis-critical claim work.

**Pass:** credible contrary evidence was sought and either incorporated, dispositioned, or honestly reported as not found.

## T6: Recorded-media provenance

**Test:** Use a story with a material YouTube/video/audio claim.

**Pass:** source URL, uploader, date, transcript/caption provenance, timestamps, and applicable existing A/V gates are recorded; AI summary is not evidence.

## T7: Content-type usefulness

**Test:** Run at least one of each high-priority type during the pilot when source material warrants it: `INVESTIGATION/FOLLOW_UP`, `SIGNAL`, `EXPLAINER`, `FIELD_TEST`, `ACTION_BRIEF`.

**Pass:** each artifact has a distinct editorial job and does not collapse into generic promotion.

A missing type is not a failure if no credible story warranted it. Record the gap.

## T8: One atom, native derivatives

**Test:** Take one approved content atom through at least two channels.

**Pass:** derivatives are channel-native rather than copy-paste, and are still traceable to the same atom/evidence.

## T9: Calendar simplicity

**Test:** Founder and Sunny use the shared calendar for two consecutive weeks.

**Pass:** the calendar answers what is being investigated, what ships, where it goes, status, and measurement checkpoint without duplicating the claim ledger or article state.

## T10: LinkedIn telemetry

**Test:** Publish a Company Page distribution.

**Pass:** publication ID/URL and available native metrics are captured; event-level LinkedIn observation follows the existing ledger rules.

## T11: Kit telemetry

**Test:** Send `RzL Signal`.

**Pass:** broadcast ID, measurement date, unique clicks, subscriber movement, and relevant replies are captured when available; missing fields remain explicitly missing.

## T12: Reddit guardrail

**Test:** Publish a native Reddit contribution in a relevant community.

**Pass:** useful content exists without requiring the RyzaLab click; community rules were checked; any moderation action is recorded.

## T13: Facebook role

**Test:** Distribute one relevant item.

**Pass:** it is selective/local/consumer-relevant rather than automated duplication; native metrics and owned-intent evidence are recorded when available.

## T14: Business telemetry

**Test:** At every fixed pilot checkpoint, reconcile content-attributed CRM and booking evidence.

**Pass:** qualified leads, consultations, and revenue are recorded as measured values or `[NO DATA]`; no inference from vanity metrics.

## T15: Founder-time baseline

**Test:** Compare calendar/AI assisted cycles with a measured manual baseline of comparable work.

**Pass:** active founder time includes review, clarification, correction, logging, and rework.

No guessed baseline is accepted.

## T16: Operating-leverage continuation

**Test:** At pilot close, compare active founder/expert minutes on comparable repeated cycles.

**Pass for promotion:** at least 25% reduction with guardrails intact, unless a different quality-first tradeoff was precommitted before results.

## T17: Business outcome disposition

**Test:** Apply the predeclared decision rules.

**Pass:** result is explicitly `SCALE`, `ITERATE`, `REDUCE_CHANNEL`, `NO_GO`, or `INCONCLUSIVE`, with evidence.

## T18: No telemetry-schema overbuild

**Test:** Inspect implementation changes.

**Pass:** no new permanent multi-channel telemetry schema exists unless a real decision was blocked by the current evidence path and the integration boundary is documented.

## T19: AI safety/information boundary

**Test:** Inspect Sunny/AI inputs for one real reporting cycle.

**Pass:** personal/student AI sees only public, synthetic, or materially anonymized context; private RyzaLab/customer information follows the existing managed-access rules.

## T20: Human prose QA

**Test:** Run the current prose precheck/humanizer workflow on a release candidate.

**Pass:** all mechanical findings and humanizer findings are dispositioned; final prose does not read like templated campaign copy.

## T21: Distribution identity

**Test:** Inspect every Distributions row published in a pilot week.

**Pass:** each row has a unique `distribution_id` in the required format; each row's tagged destination link is what `scripts/distribution_link.py` prints for the row's ID, channel, short code, atom and website-confirmed canonical URL, so it carries `utm_id` equal to that ID; a post with a link carries the row's `ryzalab.com/n/<code>` exactly once and no other link, never the long URL or an `lnkd.in` link; no `/n/` code appears on more than one row across all Distributions rows, not just this week's; the code is 11 or fewer of `[a-z0-9]`; `curl -sI` on the short link returns `302`, a `location` byte-equal to the tagged link and `cache-control: no-store`; a code first confirmed absent from `functions/_short_links.js` returns `404`; the tagged link's page is the expected article, checked by its `<link rel="canonical">` and title rather than by a `200` alone, because the site answers some missing paths with a soft 404; each published row records the live post's own URL; the Notion row and `content/<content_id>/distribution.yaml` agree.

## T22: Cadence

**Test:** Count published LinkedIn posts per pilot week.

**Pass:** 3 a week, or the shortfall is recorded with its reason (reporting not ready is a valid reason; it is never padded).

## Pilot close report

At 8 weeks, return:

- content atoms published;
- distribution events by channel;
- owned-intent signals;
- qualified editorial leads;
- booked consultations;
- attributable revenue;
- active founder minutes;
- content/channel patterns;
- guardrail failures;
- final disposition;
- one next action.
