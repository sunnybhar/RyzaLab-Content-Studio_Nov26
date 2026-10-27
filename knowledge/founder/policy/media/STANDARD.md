# STANDARD: RyzaLab Media Reporting, Distribution, and Measurement

**Status:** Adopted 2026-10-02 as v0.2 (from the 2026-09-29 v0.1 handoff)  
**As of:** 2026-09-29  
**Purpose:** Minimum rules for investigative reporting and channel distribution without duplicating the canonical editorial SPEC

## 1. Reporting standard

### 1.1 Evidence before prose

Use the existing sequence:

`question -> Lock 1 -> research -> countercase -> timeliness -> Lock 2 -> prose -> TEST -> ASSURE -> founder release`

Do not draft the article before Lock 2.

### 1.2 Source priority

Continue the existing source hierarchy:

1. original research, official records, standards, government data, court/regulatory/procurement records, first-party technical docs, security advisories, release notes, source code where legitimately available;
2. high-quality independent journalism and specialist analysis;
3. practitioner material;
4. forums/social for leads or anecdotes.

Open the underlying evidence when reasonably available.

### 1.3 Current reporting

For a present-tense story, default to at least one dated trigger from the previous 12 months.

Older material may establish history or a baseline.

### 1.4 Countercase

For thesis-critical claims, actively seek evidence that would narrow, contradict, or kill the proposed story.

A documented search that finds no strong counterevidence is acceptable. Never manufacture opposition.

### 1.5 Follow-up

Before treating an issue as new, check:

- prior RyzaLab Notes;
- prior investigations/research;
- vendor promises/fixes;
- later papers;
- regulator/court outcomes;
- product/terms changes.

Prefer a follow-up when it adds cumulative knowledge.

## 2. Recorded media standard

YouTube, conference talks, hearings, interviews, podcasts, and product demonstrations may be primary evidence.

When material:

1. resolve the original source;
2. obtain transcript/caption track with the approved transcript workflow;
3. record URL, uploader, date, timestamps, and caption type;
4. apply the existing A/V provenance gates where triggered;
5. do not accept AI-generated video summaries as evidence.

If transcript retrieval is unavailable, mark the material claim `RED_RESEARCH` or use a weaker supported form.

## 3. System-tracing standard

When the story is about data, control, or external dependence, trace only the links evidence supports:

`consumer -> device/app -> local network -> vendor/cloud -> third party/data broker -> downstream commercial/government access`

For each link, state:

- data/capability transferred;
- purpose;
- controlling entity;
- evidence;
- uncertainty.

## 4. Reader-action standard

Where a meaningful action exists, verify it before publication.

Actions may include:

- settings/permissions;
- telemetry opt-outs;
- network isolation;
- DNS/network configuration;
- deletion/access requests;
- product alternatives;
- local processing;
- consumer/privacy rights.

"No practical mitigation exists today" is an acceptable result.

## 5. Voice and AI-detection resistance

The goal is not to fool an AI detector. The goal is to produce human-quality reporting that does not exhibit obvious templated machine writing.

Prefer:

- concrete documents and observations;
- specific technical mechanisms;
- meaningful quotations;
- numbers with denominators;
- contradictions and failed attempts;
- uncertainty;
- varied sentence length and paragraph rhythm;
- editorial judgment grounded in reporting.

Avoid:

- generic hook formulas;
- emoji scaffolding;
- repetitive rule-of-three structures;
- identical "problem -> benefits -> CTA" sequences;
- promotional RyzaLab copy inside reporting;
- fake personal experience;
- inflated significance;
- generic AI transitions;
- cosmetic "humanization" of an under-reported draft.

Run the existing humanizer/prose-scanner process at TEST and disposition every finding.

## 6. AI-use standard

### Allowed

- discover public leads;
- organize sources;
- compare documents;
- prepare countercase questions;
- download/organize transcripts when tools permit;
- summarize technical source material after the original source is opened;
- map claims to evidence;
- repurpose an approved atom into channel-native drafts;
- run mechanical/prose QA.

### Not allowed

- AI output as factual evidence;
- fabricated sources or quotations;
- article drafting before evidence lock;
- silent use of confidential customer/company material in personal AI;
- autonomous public posting without authority.

Sunny's existing information boundary remains controlling for personal/student AI.

## 7. Distribution standard

### LinkedIn

Default role: professional discovery.

Track at least:

- impressions;
- external-link visits when available;
- substantive inbound conversations;
- qualified leads.

### Reddit

Default role: technical community and reporting intelligence.

Track at least:

- original contribution count;
- substantive-response count;
- research/source leads;
- moderator removals or spam warnings.

Do not use Reddit as a broadcast feed.

### Facebook

Default role: selective local/consumer distribution.

Track at least:

- native engagement with denominator;
- owned-intent events;
- qualified conversation if any.

### Kit

Default role: owned audience.

Track at least:

- delivered audience/recipient count where available;
- unique click rate;
- net subscribers;
- replies;
- qualified leads and downstream revenue when attributable.

Treat open rate as diagnostic only because privacy features can distort it.

## 8. Measurement standard

### North star

`attributable media revenue`

### Business funnel

`qualified editorial leads -> booked consultations -> paid engagements -> attributable revenue`

### Efficiency

`active founder minutes per accepted content atom/distribution cycle`

Do not report elapsed agent runtime as founder effort.

### Missing data

Use `[NO DATA]` or equivalent explicit null state.

Do not convert "not measured" into zero.

### Distribution identity

A piece has one `content_id` for life. It is chosen here and never changes, even when the article
is renamed or moves to a new URL. The URL is not the identity: this repo only proposes a slug
(`proposed_slug`), and the website decides where the article lives. The canonical URL is copied
in from the website release after publish and stays `null` until it is verified there.

Every post on every channel gets a `distribution_id` in the form
`<channel>-<yyyymmdd>-<short>-<nn>`, for example `linkedin-20261008-applelg-01`. It is chosen
before posting, never changes, and is never a platform URL. `<short>` is the attribution short
code for the piece: one per `content_id`, in the website's grammar (lowercase letters and digits,
single hyphens allowed between them). `<nn>` 99 is reserved for synthetic canary ids and never
used for a real post. The link's `utm_id` is the same value. `distribution_id` is
the unique key from post to landing to lead; `utm_content` is a descriptive field, not a key.

| Object | Source of truth | When it changes |
| --- | --- | --- |
| `content_id` | this repo | never, including after a rename or move |
| `distribution_id` (= `utm_id`) | this repo | never; a new post or placement gets a new one. A plain repost of a Company Page post (no added text or link) is not a new post and keeps the original's id; a repost with its own text and link gets a new one |
| `<short>` (`attribution_short_code`) | this repo proposes; the website maps it to `content_id` | never once used in a link |
| `utm_campaign=notes`, the channel list, `utm_content` (the content atom) | this repo | the atom is set per post, before posting |
| `proposed_slug` | this repo | freely, until the website publishes |
| canonical URL and path, redirects, legacy paths, sitemap | `ryzalab-website` | on a website release; old paths redirect |
| `/n/<code>` short link and its destination | `ryzalab-website` `functions/_short_links.js` | by a reviewed website PR |

The website holds a route registry, `functions/_content_routes.js`, mapping each
`content_id` to its `canonical_path`, `legacy_paths` and `attribution_short_code`. Take the
canonical URL from that entry and the live page.

This section owns the distribution id format, the Notes campaign value (`notes`) and the channel
list (`linkedin`, `reddit`, `facebook`, `kit`); founder decision 2026-10-15. The live website
already enforces them: a short code is stored only once it is in `DISTRIBUTION_SHORT_CODES`
(ryzalab-website `functions/_measure_sanitize.js`), which is derived from the route registry, so
add the Note's `functions/_content_routes.js` entry before its first tagged post. Links tagged earlier with `utm_campaign=notes-launch-2026-08` or a
`dist-YYYYMMDD-<channel>-<content_id>-NN` id stay valid and are not re-created.

**The link in a post.** A post with no link (a Reddit comment, a Kit section without a CTA)
still gets an ID, so its native metrics can be logged against it. When a post contains a link,
its only link is `ryzalab.com/n/<code>`, on every channel. The website answers it with a `302`
to the tagged destination. Never post the long tagged URL or an `lnkd.in` link. This is the
shortest link that is also robust: LinkedIn rewrites visible links longer than about 25
characters to `lnkd.in`, which hides the domain from the reader and answers 403 to anything but
a browser, so the tags could never be checked.

- The `/n/` code belongs to one distribution and is allocated on its own: lowercase letters and
  digits only, at most 11 characters (so `ryzalab.com/n/<code>` stays within 25), unique across
  the whole table. Use `<short>` for a piece's first post when it fits and is free; otherwise
  pick any unused code. Do not build it as `<short><nn>`: posts on two channels or dates can
  both be `-01`, a hyphenated `<short>` loses its hyphens, and `foo2` plus `01` is `foo201`,
  which is already the plain code of a piece whose `<short>` is `foo201`. The website enforces
  uniqueness.
- The destination is the canonical URL confirmed by the website release, plus, in this order,
  `utm_source=<channel>`, `utm_medium` (`social` for LinkedIn, Reddit and Facebook, `email` for
  Kit), `utm_campaign=notes`, `utm_content=<content atom>` and `utm_id=<distribution_id>`. Build
  it with `scripts/distribution_link.py` or the Notion **Tagged link** formula, never by hand.
  The script takes the canonical URL as an explicit input and knows nothing about website
  routes; the website keeps the route and deployment checks. Every piece needs
  `content/<content_id>/note.yaml` before its link can be built: the script refuses a
  `--short-code` that is not that note's `attribution_short_code`.
- The website serves the code from a reviewed table (`functions/_short_links.js`): exact path
  match, `Cache-Control: no-store`, and an unknown code is a 404. `ryzalab-website`
  `docs/PUBLISHING_HARNESS.md` section 8 covers adding one. Post only once the code passes
  TEST_PLAN T21.

### Attribution

Accept:

- verifiable UTM/referral data;
- platform-native external-link metrics;
- CRM/source evidence;
- explicit self-report from the lead.

A zero attributed count does not prove zero caused demand.

## 9. Experiment/ledger standard

Every material strategy decision should have:

1. a decision question;
2. at least one key metric;
3. telemetry/evidence source;
4. an experiment or observation path;
5. a disposition rule.

Use the existing RyzaLab experiment system.

Do not create a new governance ledger just for Media.
