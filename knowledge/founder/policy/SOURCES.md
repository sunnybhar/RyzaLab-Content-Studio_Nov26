# Source registry

A cache of domains two completed production runs actually opened, classified into the
four-level source preference order in `policy/SPEC.md`, plus the access status observed
for each. It exists so a research lane stops rediscovering the same domains every run, and
stops burning a fetch budget on sources already known to block automation.

**What this is not.** It is not an allowlist: a domain that is absent here is not
disqualified, and most of the web is absent here. It is not a substitute for judging a
source in context. Presence in this file never makes a claim citable. The claim ledger
still decides that, one claim at a time, against the evidence standard in SPEC. A level 1
domain can still be an interested party publishing marketing, and a level 4 forum post can
still be the only honest record of what practitioners actually do.

**Levels** are SPEC's preference order, not a quality score. Level 1: original research,
official records, standards, government data, first-party technical docs. Level 2:
high-quality independent journalism and specialist analysis. Level 3: practitioner
material. Level 4: forums and social, for leads or anecdotes only.

**Flags**

| Flag | Meaning |
|---|---|
| INTERESTED PARTY | The source sells the thing it is describing. Usable, but never as independent proof. |
| ACCESS BLOCKED | Automated fetch failed. Symptom recorded in Access notes below. |
| STALE | Dated material. Fine for history, not for a present-tense claim. |
| NEGATIVE FINDING | Used to establish that something is absent, not that something is true. |
| PARTIAL | Some of the source is reachable and the load-bearing part is not. |

## Level 1: standards, official records, first-party technical

| Domain | What it is good for | Flags |
|---|---|---|
| cedia.org | Trade association residential wiring guidance | INTERESTED PARTY (members sell pre-wire) |
| tiaonline.org | TIA-570-E announcement and revision status | PARTIAL (full tables paywalled) |
| standards.tiaonline.org | Call for interest, PoE cabling work | |
| nfpa.org | NEC 70 product page, article scope | PARTIAL (primary text not fully accessible) |
| standards.ieee.org | 802.3bt-2018 standard record | |
| ieee802.org | 802.3bt task force material | |
| csa-iot.org | Matter 1.4 release notes | INTERESTED PARTY |
| threadgroup.org | Thread positioning, including the concession that it complements a wired backbone | INTERESTED PARTY (the concession is an admission against interest and is the reason to cite it) |
| wi-fi.org | Wi-Fi 6E, framed for enterprise | Logged as a gap, not as support for a residential claim |
| ethernetalliance.org | PoE wattage classes | INTERESTED PARTY |
| getmatter.org | Matter standards body material | INTERESTED PARTY |
| whitepapers.axis.com | Single-vendor camera power draw | INTERESTED PARTY, illustrative only, never a category figure |
| nahb.org | Builder survey, n=41; electrical rough-in bundled | Small n; not low-voltage specific |
| jlconline.com | Cost vs Value Report, remodeling cost and resale data | NEGATIVE FINDING (no structured wiring category exists in it) |
| hrf.org | Event organizer first-party recap and talk pages | INTERESTED PARTY (organizer describing its own event) |
| oslofreedomforum.com | Organizer talk pages | INTERESTED PARTY |
| youtube.com | Primary artifact for A/V provenance: metadata, caption tracks, frames | Primary artifact, not a publisher; see SPEC video and audio provenance |
| youtube-nocookie.com | Measured privacy-preserving embed target: 0 Set-Cookie on first load, versus 6 on youtube.com | Measurement, re-verify before repeating it |

## Level 2: independent journalism and specialist analysis

| Domain | What it is good for | Flags |
|---|---|---|
| ecmweb.com | Secondary route into NEC Article 725 when the primary is not reachable | |
| cablinginstall.com | TSB-184-A detail; also relays a 2014 NECA survey | The NECA relay is a relay, not the survey; STALE |
| staceyoniot.com | Strongest independent counter-voice on the wiring-first case being dated | Seek it out on purpose; it argues against the house thesis |
| rtings.com | Strongest quantitative anchor available: bench-tested wired versus wireless backhaul gap | Two products, one lab; scope the claim to that |
| howtogeek.com | General consumer explainer | |
| dongknows.com | Networking specialist analysis | |
| hackaday.com | Insteon 2022 shutdown, a real ecosystem obsolescence case | |
| fortune.com | Contemporaneous corroboration, VERIFIED | An earlier Fortune URL 404'd in the same run: verify the exact URL, not the domain |
| unherd.com | Contemporaneous corroboration, VERIFIED | |
| thehill.com | Would have been contemporaneous corroboration | ACCESS BLOCKED (403); explicitly marked do not cite as verified |
| parksassociates.com | Market context only | Never a technical claim |
| listwithclever.com | 2024 renovation regret survey, base rate only | NEGATIVE FINDING (contained no wiring finding) |
| moneywise.com | 2022 corroborating renovation survey | NEGATIVE FINDING (likewise no wiring finding) |
| cepro.com | 2012 practitioner survey | STALE, ACCESS BLOCKED (403), full text unverified |

## Level 3: practitioner material

| Domain | What it is good for | Flags |
|---|---|---|
| viboelectric.ca | Licensed electrician, panel layer | Thin on smart home |
| ameritechs.co | Low-voltage contractor pre-wire checklist | INTERESTED PARTY (sells this service) |
| keystoneintegration.us | ADMISSION AGAINST INTEREST: a wiring vendor conceding mesh is fine under 2,500 sq ft | INTERESTED PARTY, which is precisely why the concession carries weight |
| scottstuff.net | Enterprise fiber cautionary anecdote | Anecdote, single operator |
| goodbones.substack.com | Personal renovation essay | Marginal |

## Level 4: forums and social, leads or anecdotes only

| Domain | What it is good for | Flags |
|---|---|---|
| xda-developers.com | Enthusiast anecdote | Not licensed trade; lead only |
| cocoontech.com | NEGATIVE FINDING: wireless-only is a minority view even among enthusiasts | Lead only |
| instagram.com | Organizer social posts | REPORTED only, no clip assets |
| lnkd.in | Organizer social posts | REPORTED only, no clip assets |

## Access notes

Domains observed to block or limit automated fetches, with the exact symptom. Re-test
before treating any of these as permanent, but do not spend a research lane rediscovering
them.

| Domain | Symptom | What it does and does not mean |
|---|---|---|
| thehill.com | HTTP 403 on fetch | Not verifiable by this harness. Do not cite as verified. |
| cepro.com | HTTP 403 on fetch | Full text unverified; the 2012 survey is also STALE independently. |
| doaj.org | CAPTCHA interstitial | Named as a gap in the run, never used as evidence. |
| usenix.org | HTTP 403 with a browser user agent | A WAF block. This is NOT evidence the page is gone, and must never be written up as a dead link or a retraction. |
| nfpa.org | Product page reachable, standard text not | Cite the scope, not the clause. Use a level 2 route such as ecmweb.com for article detail. |
| tiaonline.org | Announcement reachable, full tables paywalled | Revision status is citable; table values are not. |
| fortune.com | One URL returned 404 while another on the same domain resolved | Domain access is fine. Verify the exact URL every time. |

### News and timeliness

No domain in this registry is a general news trigger source. Nothing here was used, or
should be used, to establish that a topic is current, trending, or newly contested.

A timeliness lane must cite a specific dated primary item: a standard revision with a
ballot date, a dated release note, a dated filing, a dated report. "This is getting a lot
of attention right now" is not a claim this registry can support, and it is not a claim the
claim ledger should pass.

This subsection is deliberately empty of domains. It stays empty until a run actually
populates it with sources it used and verified.
