# SPEC: RyzaLab Media Editorial + Calendar

**Status:** Adopted 2026-10-02 as v0.2 (from the 2026-09-29 v0.1 handoff)  
**As of:** 2026-09-29  
**Canonical integration target:** `policy/SPEC.md` and the existing runbook (`policy/EDITORIAL_LOOP.md`), not a parallel permanent policy stack

## 1. Purpose

Extend the existing RyzaLab Notes editorial harness into a small RyzaLab Media operation while preserving the current evidence-first workflow.

This spec does not replace:

- `policy/SPEC.md`
- `policy/SOURCES.md`
- `policy/EDITORIAL_LOOP.md`
- current brand/offer/release sources
- the existing experiment ledger

Adoption should merge the durable policy delta into the current canonical files and retire this standalone proposal as a handoff artifact.

## 2. Editorial scope

RyzaLab Media may investigate:

- technology and the internet;
- cybersecurity;
- consumer rights;
- surveillance;
- privacy;
- consumer IoT and smart-home products;
- routers, Wi-Fi, DNS, VPNs, Bluetooth, Zigbee, Thread, Matter, and other network infrastructure;
- cameras, microphones, doorbells, sensors, TVs, appliances, wearables, vehicles, and other connected products;
- telemetry, advertising technology, SDKs, and data brokers;
- AI embedded in consumer products and services;
- government acquisition or use of commercially collected data;
- product shutdowns, subscriptions, interoperability, repairability, lock-in, and external dependencies.

Consumer smart-home technology is a core beat, not the publication boundary.

## 3. Commercial brand vs. editorial scope

The commercial brand source governs claims about RyzaLab's services, capabilities, customers, promises, and offers.

It does not require RyzaLab Media to lead with personalized design or professional services in editorial reporting.

Editorial work may investigate or criticize approaches that RyzaLab itself uses. A Note does not need to mention RyzaLab services.

## 4. Investigative posture

A strong story normally reveals at least one thing that is difficult to see from ordinary product marketing or routine coverage:

- a technical behavior;
- telemetry or data-sharing path;
- policy, terms, or firmware change;
- unexpected dependency;
- security or privacy implication;
- downstream access to consumer data;
- gap between product marketing and operation;
- shutdown, subscription, compatibility, or repair consequence;
- new research that changes what was previously understood;
- evidence that prior reporting or a prior RyzaLab Note needs updating.

Do not start with a predetermined conclusion such as "cloud is bad", "local is good", or "AI is dangerous". Start with a question the evidence can answer.

## 5. Reporting model

Where relevant, trace:

`consumer -> device/app -> local network -> vendor/service -> third party/SDK/data broker -> commercial or government access -> consequence`

Not every story needs every link.

For each material link distinguish:

- what is directly established;
- what is inferred;
- what remains unknown.

## 6. Timeliness and follow-up

For current reporting, default to sources published, released, filed, measured, or materially updated within the previous 12 months.

Older evidence is allowed when it is:

- primary documentation;
- seminal research;
- necessary history;
- the original event being followed up;
- the baseline for new evidence.

Follow-up reporting is first class. Ask what happened after earlier research, reporting, product promises, vulnerabilities, policy changes, acquisitions, shutdowns, or RyzaLab Notes.

## 7. Content types

The editorial calendar uses six content types:

| Type | Definition | Typical output |
|---|---|---|
| `INVESTIGATION` | Original reporting that establishes a non-obvious material fact or system behavior | RyzaLab Note + derivatives |
| `FOLLOW_UP` | Revisit earlier reporting/research and establish what changed | Note or concise update |
| `SIGNAL` | Curate a high-value external article/research item with original RyzaLab analysis | LinkedIn, Kit, Facebook, Reddit where appropriate |
| `EXPLAINER` | Explain the mechanism behind a current issue | Note, LinkedIn, carousel, Kit |
| `FIELD_TEST` | Reproduce or directly test a product/network/claim/failure mode | Note, Reddit, LinkedIn |
| `ACTION_BRIEF` | Verified practical steps for a reader | Note, Kit, social derivative |

A `SIGNAL` is not "interesting link, check it out." It should state what the source found, what primary evidence matters, RyzaLab's technical interpretation, consequences, and what remains unanswered.

## 8. Editorial calendar feature

### 8.1 Goal

Give the founder and Sunny one operating view that answers:

1. What are we investigating?
2. What ships this week?
3. Which channels carry each content atom?
4. What produced owned attention or buying intent?
5. What should be repeated, changed, followed up, or stopped?

### 8.2 v0 surface

Use two linked Notion databases in the RyzaLab workspace: **RzL Media Content** (one row per
`content_id`) and **RzL Media Distributions** (one row per post, keyed by `distribution_id`).
The calendar view sits on Distributions. A Grok assistant may read both, flag hygiene problems and
draft the weekly plan; it never publishes, never creates, changes or reverses any status, and
never edits evidence.

Do not build a custom app.

### 8.3 Minimum fields

**RzL Media Content** (one row per piece): `content_id`, title, content type, reporting question,
current trigger/source, owner, editorial status, proposed slug, canonical URL (copied from the
website release after publish, empty until verified there), attribution short code (`<short>`),
content atom, intended CTA, measurement checkpoint, link to `content/<content_id>/` in
`ryzalab-content`. The URL can change; `content_id` does not (STANDARD section 8).

**RzL Media Distributions** (one row per post): `distribution_id`, content (relation), channel,
scheduled date, status, `utm_content` (the content atom), tagged link (built by formula from the
canonical URL and the UTM fields, so nobody types UTMs by hand), short link
(`ryzalab.com/n/<code>`, the only link a post carries; STANDARD section 8), live post URL,
measured-at date.

The calendar does not store the authoritative claim ledger or replace `STATE.yaml`.

### 8.4 Statuses

`IDEA -> RESEARCHING -> EVIDENCE_READY -> DRAFTING -> FOUNDER_REVIEW -> READY -> PUBLISHED -> MEASURED -> FOLLOW_UP`

These are operating labels only. They do not replace the existing article lifecycle or release gates.

## 9. Distribution model

One content atom can create several channel-native distributions.

Do not count those derivatives as several original stories.

Default cadence for the pilot (target: 3 published posts a week):

- LinkedIn Company Page: 3 native posts/week (Tuesday, Wednesday, Thursday). Every post
  originates on the RyzaLab Company Page. Ryan's plain repost from his personal profile is
  allowed and expected; it is not a separate tracked post, and its effect shows up as extra
  reach on the Company Page post (founder decision 2026-10-23).
- Reddit: 1 useful original contribution/week plus substantive comments when warranted
- Facebook: up to 1 selective distribution/week
- Kit: 1 weekly `RzL Signal`
- RyzaLab Notes: 1 original investigation/follow-up about every 2 weeks

A breaking or unusually strong `SIGNAL` can replace a scheduled social derivative. It should not automatically add another obligation.

## 10. Channel roles

### LinkedIn

Primary professional discovery. Posts originate on the Company Page, amplified by a founder
repost.

Prefer:

- reporter notes;
- investigation derivatives;
- data-flow or evidence carousels;
- annotated external `SIGNAL` posts;
- source requests or polls only when they genuinely improve reporting.

### Reddit

Community intelligence and technical participation.

Prefer:

- field-test results;
- native technical posts;
- research/source requests;
- high-quality answers;
- investigation links only where subreddit rules allow them and the post is useful without the click.

### Facebook

Secondary/local distribution.

Prefer:

- local Austin/NYC relevance;
- concise status posts;
- evidence albums;
- short field-test video;
- selected consumer-tech warnings and investigations.

Avoid routine outbound-link dumping.

### Kit

Owned recurring distribution.

Default weekly format:

1. lead story;
2. three `SIGNAL`s;
3. one practical action;
4. what RyzaLab is investigating;
5. optional commercial CTA below the editorial material.

## 11. AI role

AI may assist with:

- source discovery;
- source organization;
- countercase research;
- claim-ledger preparation;
- transcript/caption retrieval using the approved workflow;
- document comparison;
- technical summarization after the original source is opened;
- repurposing an approved content atom into channel-native formats;
- prose QA and machine-pattern detection.

AI may not:

- serve as the factual source for a material claim;
- invent a quote, result, statistic, or source;
- draft publication prose before Lock 2;
- treat a generated summary of audio/video as verified evidence;
- bypass the existing Sunny/private-information boundary;
- publish without founder authority.

## 12. Measurement contract

### Business metrics

1. attributable media revenue;
2. qualified editorial leads;
3. booked consultations.

### Driver metrics

- LinkedIn: impressions and external-link visits; substantive inbound conversations
- Kit: unique clicks, net subscribers, replies
- Reddit: substantive-response rate, research leads, moderation removals
- Facebook: owned-intent events and native engagement
- RyzaLab Notes: owned visits when measurement is available, qualified inbound references, downstream booking/revenue

### Efficiency

Track active founder minutes per accepted content atom and per distribution cycle.

The editorial calendar/AI operating layer is promoted only if it produces decision-useful coordination improvement. The proposed continuation target is at least 25% lower founder/expert time on a comparable repeated workflow, with editorial and authority guardrails intact.

## 13. Ledger contract

Use the existing RyzaLab experiment system.

- Parent: existing `EXP-GTM-editorial-acquisition`
- Child: `EXP-GTM-media-calendar-pilot`
- Register the child in the existing `docs/experiments/experiments.jsonl`.
- Keep current LinkedIn event-level telemetry in `docs/experiments/data/editorial_observations.jsonl`.
- Every post on every channel gets a `distribution_id` (`<channel>-<yyyymmdd>-<short>-<nn>`), and any link in it is `ryzalab.com/n/<code>`, which redirects to a tagged destination carrying `utm_id=<distribution_id>`. This is the one join key from post to landing to lead; it supersedes the v0.1 rule that kept non-LinkedIn channels identity-free.
- For Reddit, Facebook, and Kit, keep raw native analytics as cited evidence snapshots and log the decision metrics at the child-experiment checkpoints.
- Raw analytics stay out of git. Do not add a new permanent telemetry store; `distribution_id` rides the existing first-party attribution path.
