# RyzaLab Notes — Voice Guide

Merges editorial spec §13 with the site's canonical brand voice
(`docs/brand/BRAND_POSITIONING_AND_MESSAGING_V3.md`, founder-approved 2026-08-08).
Where the two could conflict, the brand doc's locked hierarchy and retired-vocabulary
list win — Notes are still ryzalab.com pages.

## Editorial personality

> Serious research. Clear opinions. A raised eyebrow where earned.

Practitioner rather than guru. Confident where evidence is strong, candid where it's
mixed, concrete, curious, occasionally skeptical, lightly irreverent, willing to say a
popular idea is dumb when the evidence earns it.

Cheekiness belongs in: headline, opening observation, metaphor, transition, aside,
conclusion. It does not belong in: study results, customer harm, security incidents,
individual people, unresolved claims.

**Voice test:** Would Ryan plausibly say this to an intelligent architect over coffee? —
not "does this sound engaging?"

## Brand voice rules (from BRAND_POSITIONING_AND_MESSAGING_V3.md §5) — apply to Notes too

1. Lead with the customer's home, not the industry's enemy. One negation maximum, never
   before the first positive.
2. Tenure-neutral — never assume the reader owns the building.
3. Every claim states its own limit. No absolutes the architecture can't guarantee, no
   hedges either — if a claim needs a hedge, cut the claim.
4. Concrete nouns beat abstract virtues. "Your configuration repository" beats
   "transparent architecture."
5. Professional-services register — not consumer-tech, not engineer-speak, not
   counter-culture.
6. One name per thing. The $395 assessment is the Blueprint. The CTA is "Book Your
   Blueprint." The handoff document is the Operations Guide.

### Retired vocabulary (never use)
`production-grade` (to buyers), `The Peeping Tech`, `No Lock-In` as a lead, `Your Code,
Your Keys` as a headline, `Pay Once, Own Forever`, `zero cloud`, `no cloud dependency` as
an absolute, `counter-culture`, `solutions`, `seamless`, `leverage`, `empower`,
`cutting-edge`, `revolutionary`, `innovated`.

### Claims discipline — do not restore
No absolute uptime/reliability claims ("always works," "never fails"). The site
evidences *practices*, not guaranteed outcomes. Ownership claims stay scoped to what the
proof strip actually promises: the client's own Home Assistant instance, configuration
repository, documentation, no subscription for the core system. Never claim zero cloud
dependency, no third party ever processes data, or absolute portability.

## Banned synthetic habits

Remove or heavily scrutinize: "In today's rapidly evolving landscape," "It's not just X,
it's Y," fake epiphanies, unsupported "experts say," rule-of-three list padding, generic
inspirational endings, a rhetorical question every third paragraph, "game changer,"
"delve," "unlock," "seamlessly," abstract "landscape," inflated "underscores"-type
claims, repetitive recap conclusions, suspiciously uniform paragraph rhythm.

Human-like does not mean typos or fake personal stories. It means a real opinion,
source-derived specifics, uneven sentence rhythm, taste, restraint, small surprises, and
real lived perspective when it's genuinely available (labeled as such).

## House mechanics (from existing Notes + `_TEMPLATE.html`)

- Byline: `<Month D, YYYY> · Ryan`, on every Note, including one someone else drafted.
  `note.yaml` keeps `author:` (who drafted it, for the record) apart from `byline:` (what is
  printed, `Ryan` by default). A different byline is Ryan's call, made in the release line:
  `BYLINE:<name>` after `APPROVE RELEASE` (founder decision 2026-10-16, #14).
- Lead paragraph: italic, left-bordered, one to three sentences, is the thesis/hook —
  not a restatement of the headline.
- H2 sections, short paragraphs (2-5 sentences), one blockquote used for a genuine pull
  quote or cited passage, not decoration.
- Internal links to other Notes and to `/austin`, `/nyc`, `/#book` used sparingly and
  only when they earn the click.
- Closing paragraph ties back to the thesis and, where earned, ends on the CTA
  — never bolted on if the piece hasn't earned the pivot. What the CTA
  says about the offer, and where it links, comes from `policy/offer.md`.
- Claim markers (`[C014]`) live in the working draft only; Standards strips them before
  `FINAL.md`.

## Calibration example

`notes/sovereignty-at-the-scale-of-a-home.html` is the closest existing Note to this
target register: opinionated framing hung on one real external event (Huang's letter),
scoped RyzaLab claims ("built to run locally... because the critical path lives in the
building"), explicit "that last step is mine, not his" — the desk should hold that same
line between what the source says and what RyzaLab is arguing.
