# RyzaLab brand brain

Compiled from the RyzaLab repository (skills/ryzalab-brand-guard/references). Do not edit this copy: change the repository and rebuild. Where sections disagree, Decisions wins, then Company facts.

## Decisions

Every open brand or GTM question that changes what the tools are allowed to say. When Ryan decides one, change its status to APPROVED, record the date and the choice, and update `company.md`, `positioning.md` and `scripts/rules.json` to match.

The full evidence and recommendation for each item is in `docs/conflicts-register.md`.

| ID | Decision | Status | Current rule for the tools until decided |
|---|---|---|---|
| D-01 | Campaign name "What Stays Home" and core message "Your family's moments stay in your home" | PENDING | Usable in drafts, marked for approval |
| D-02 | Lead segment and beachhead (families vs renovation trade vs broken-system audit vs renters vs DIY) | PENDING | Families lead in drafts. No exclusive claims about any segment |
| D-03 | Success targets: 20/25/30 customers a month vs the 90-day scorecard (3+ paid Blueprints) | PENDING | Tools report against both |
| D-04 | Prices: Blueprint $395 vs $500 to $750; Setup from $1,195 vs Nursery Setup $1,500 and Family Core from $3,500 | PENDING | Only website prices in public copy |
| D-05 | In-person city for Nov to Jan (Brooklyn or Austin) | PENDING | Say "Austin and New York City" as on the site |
| D-06 | One name for the $75/month plan (Ongoing Support, Maintenance Service, Care Plan, Peace of Mind) | PENDING | Use "the $75/month support plan" |
| D-07 | Pillar set: three (privacy, reliability, ownership) or four (private, unified, yours, reliable) | PENDING | Lead with the site's three, add "one app" as a benefit |
| D-08 | Strength of the privacy promise | RECOMMENDED | Use the privacy flyer's wording. "Nothing leaves the house" is blocked |
| D-09 | Device language: "certified" vs "verified" vs "RyzaLab tested" | RECOMMENDED | "Verified" in public copy |
| D-10 | Device packages: sell curated devices or advise only | PENDING | Advise only. No device sales language |
| D-11 | Family age range: 0 to 6 (campaign) vs under 5 (scorecard) vs 0 to 18 (Oct 5 notes) | PENDING | Babies and young children only. No teen monitoring |
| D-12 | Blueprint fee credited toward Setup within 30 days | PENDING | Not mentioned |
| D-13 | Newsletter cadence: weekly vs every two weeks | PENDING | Plan for weekly, review on Oct 24 |
| D-14 | Comparative claims on the renter one-pager ("Starting $25k", "Connect any devices*") | RECOMMENDED | Blocked until sourced or reworded |
| D-15 | Reddit's role: primary channel for DIY rescue revenue vs listening only | PENDING | Helpful answers with disclosure, no links in month one |

## Company facts

The facts every RyzaLab tool may state. Each line carries a status:

- **LIVE**: published on ryzalab.com (checked 2026-10-10). Safe to use in public copy.
- **APPROVED**: decided by Ryan in `decisions.md`. Safe to use once the website matches.
- **PENDING**: proposed in an internal document, not yet decided. Never use in public copy.
- **INTERNAL**: true, but not for customers.

If a fact is not in this file or `proof-library.md`, do not state it. Write `[Ryan to confirm: ...]` instead.

### What RyzaLab is

| Fact | Status | Source |
|---|---|---|
| Residential technology design and integration practice. Category line: "Residential Technology Design + Integration" | LIVE | ryzalab.com header |
| Tagline: "Yours by design" | LIVE | ryzalab.com hero |
| Builds on Home Assistant, which is open source. The platform is the enabler, not the product | LIVE | ryzalab.com FAQ; Strategy Brief v0.1 |
| Service areas: Austin, Texas and New York City (all five boroughs). Remote help outside driving range | LIVE | ryzalab.com |
| One founder: Ryan Gregg. 15 years inside corporate data systems (risk, GRC, analytics) | LIVE (story), INTERNAL (titles) | ryzalab.com About; Research doc |
| Origin: the first system was built in a New York City rental where nothing could be drilled or rewired | LIVE | ryzalab.com FAQ, NYC page |
| "Nacho the toddler is the stress test" | LIVE | ryzalab.com About |
| Physical electrical work is done by qualified or licensed providers, not RyzaLab | LIVE | ryzalab.com Services and FAQ |
| Contact: hello@ryzalab.com, (512) 351-4372, cal.com/ryzalab | LIVE | ryzalab.com; Customer one-pager v2 |

### Offers and prices

| Offer | Price | What it is | Status |
|---|---|---|---|
| Free intro call | $0 | 15 minutes, no prep required | LIVE |
| Blueprint | $395 | 60-minute assessment by video, plus a written plan: what to automate, buy, skip, and who to call | LIVE |
| DIY Partner | from $250 | Audit and action plan or remote setup. The customer installs hardware | LIVE |
| Smart Home Setup | from $1,195 | Design, integration, automation build, QA, documentation, handoff | LIVE |
| Support plan | $75/month | Monthly check-in, updates, new automations, priority help. Name is not settled, see `decisions.md` D-06 | LIVE (price), PENDING (name) |
| Nursery Setup | $1,500 fixed | One room, done properly | PENDING (Family one-pager v0.1 only) |
| Family Core | from $3,500 | Whole home with per-person controls | PENDING (Family one-pager v0.1 only) |
| Blueprint at $500 to $750 | $500 to $750 | Alternative Blueprint price | PENDING (scorecard, Family one-pager) |
| Apartment Core / Apartment Complete | no price | Renter packages | PENDING (Renter one-pager) |
| Home Assistant Rescue | about $250 | Remote audit for DIY users | PENDING (Research, Campaign plan) |
| Blueprint fee credited to Setup within 30 days | n/a | Conversion offer | PENDING |

Hardware is extra and belongs to the customer. Home Assistant hub typically $250 to $400. Smart switches about $20 to $50 each. (LIVE, ryzalab.com FAQ)

### The process (LIVE)

1. Consultation: review the home by video, map every device, listen to what bugs them. No sales pitch.
2. Custom design: around routines (wake up, leave, come home, wind down). Every automation has a reason.
3. Installation: configure Home Assistant, integrate devices, test every automation.
4. Ownership: the customer gets their Home Assistant instance, configuration and documentation.

### What the customer keeps at handoff (LIVE)

- A documented system map (devices, networks, integrations)
- An Operations Guide for common tasks and recovery
- Full configuration history with rollback points ("your GitHub repo" on the site; say "a full backup and history of every change" to non-technical readers)
- A Health Score checklist to keep things stable (PDF on the site)
- No subscription is required for the core system to keep working

### Evidence status (INTERNAL, never inflate)

These numbers set the honesty bar for all copy. Do not imply more traction than this.

- 2 lived-in, founder-operated proof systems (Ryan's homes). (Deck v0.5)
- 2 early paid engagements recorded internally. (Deck v0.5, CMO brief v0.4)
- "Four delivered projects, but the honest denominator is one." Two family, one small-business audit, one stranger who paid for an audit. (Advisor brief v2, 2026-08-25)
- CRM as of 2026-07-30: 2 replies, 0 visible consults, 0 proposals, 0 wins. (CRM snapshot v0.1)
- No Google reviews, no press, no published case studies yet. (Research doc)

Consequences for copy: no "trusted by families across NYC", no "our clients love", no customer counts, no testimonials until a real one exists with written permission.

### Not for customers (INTERNAL)

- The AI-assisted delivery model is internal leverage, not the customer promise. (Deck v0.5 slide 4, CMO brief)
- The "Certified Stack", Site Manifest, Commissioning Engine and Ongoing Assurance are internal product hypotheses. (Strategy Brief v0.1, scorecard)
- Services-now, software-later thesis. (Advisor brief v2)

## Guardrails

Rules every piece of RyzaLab content must pass. The automated checker (`scripts/claim_check.py`) catches the wording problems. The judgment checks below need a human or Claude to read the piece. This is not legal advice. Family pages, health disclaimers and the client consent form go to a lawyer before launch (Campaign plan).

Severity:
- **BLOCK**: cannot publish until fixed.
- **FIX**: fix before publishing unless Ryan signs off on the exception.
- **CHECK**: a person confirms it is true and approved.

### 1. Privacy and security promises (BLOCK)

No guarantees. "Absolute", "100% secure", "unhackable", "completely private", "nothing ever leaves" create deception risk under the FTC Act and contradict Ryan's own note that the fully local architecture is still being built. Describe the setup instead: where data is stored, who can reach it, which devices still need a cloud service.

### 2. Health and safety claims (BLOCK)

Never imply a RyzaLab setup prevents SIDS, monitors breathing, detects falls reliably, keeps a child or parent safe, or replaces supervision. Family and elder care content carries the line: "RyzaLab systems are not medical devices and are not a substitute for adult supervision." (Family one-pager v0.1)

### 3. Competitors (BLOCK)

Never say or imply that a named company sells customer data, spies, or is unsafe. Cite public cases by name, date and source from `proof-library.md`, using the same verbs as the source ("alleged", "settled", "proposed a penalty"). Comparative cost claims about other installers need a source (for example the "$25k" and "$40,000" figures).

### 4. Reviews and testimonials (BLOCK)

The FTC rule in force since October 21, 2024 bans fake or AI-written reviews, undisclosed reviews from insiders, friends or family, and incentives tied to a positive rating. So:
- Never draft a review, testimonial or client quote. Use `[Client quote with written permission]`.
- Review requests ask for an honest review, never a 5-star one, and are never tied to a credit or discount.
- The referral credit is for referrals, not reviews.

### 5. Sponsored and creator content (BLOCK)

Every paid or gifted creator post starts with a clear disclosure such as "#ad" or "Paid partnership with RyzaLab". Affiliate links in the gift guide are disclosed next to the link.

### 6. Unapproved offers and prices (BLOCK)

Only prices marked LIVE in `company.md` go in public copy. PENDING prices (Nursery Setup $1,500, Family Core $3,500, Blueprint $500 to $750, Blueprint credit, Rescue at $250) are blocked until Ryan approves them and the website matches.

### 7. Traction and proof (BLOCK)

No customer counts, "trusted by", "our clients", "families love", case studies or results that do not exist yet. Ryan's own home is allowed if labeled as his home.

### 8. Certification language (FIX)

Don't say "certified" unless naming who certifies. Use "verified" or "RyzaLab tested". "Certified Stack" is an internal term.

### 9. Unsourced numbers (CHECK)

Every statistic, percentage or dollar figure that isn't a RyzaLab price must match a row in `proof-library.md`.

### 10. Client homes and people (BLOCK)

Filming or photographing a client home needs signed consent. Blur faces, addresses, house numbers, screens and anything that identifies the home. Ryan's home is the main stage. No names, addresses or identifying details of leads or clients in any content or in this repository.

### 11. Electrical work (FIX)

Say plainly that a licensed electrician partner handles switch and wiring work where required. RyzaLab does not do mains electrical work.

### 12. Jargon by audience (FIX)

Family, elder care and renter copy avoids YAML, GitHub, repository, version control, VLAN, Zigbee, Z-Wave, Thread and MQTT. Fine in DIY and trade copy.

### 13. Brand consistency (FIX)

RyzaLab (never RyzaLabs), Blueprint with a capital B, one support plan name everywhere (pending D-06), no "local cloud", no "Optional but popular", no "V2.0" in customer copy, "2,000+ Home Assistant integrations" not "2,000+ integrations".

### 14. Internal model stays internal (FIX)

No "AI agent fleet", "AI-powered installer" or "replacing the human integrator" in customer copy. The AI operating model is delivery leverage, not the promise.

### 15. Email law (CHECK)

Marketing emails carry an unsubscribe link and RyzaLab's mailing address (Kit adds both).

## Positioning

Status labels as in `company.md`. Where documents disagree, the open question is in `decisions.md`, and this file uses the safest current version.

### One line

**Working promise (CMO brief v0.4):** A private, reliable smart home designed around how you live, and handed over for you to own.

**Campaign core message (Campaign plan, PENDING approval D-01):** Your family's moments stay in your home.

### Pillars

The site uses three (privacy, reliability, ownership). The brand review proposes four. Until D-07 is decided, write with these four and keep the site's three as the headline order:

| Pillar | Promise | Proof we can show |
|---|---|---|
| Private | Reduces what leaves the home. Core automations run locally where supported, and cloud dependencies are named before purchase | Privacy architecture flyer: verified devices, network segmentation, outbound traffic testing |
| Reliable | Core routines keep working when the internet is down, where the devices support it | Local control, backups, Health Score checks, offline demo |
| Yours | The customer owns the system, the admin access and the documentation, and can take it with them | Handoff package: system map, Operations Guide, change history |
| Unified | One app for the devices they already own | Home Assistant with Matter, Zigbee, Z-Wave, Thread and Wi-Fi support |

### How strong the privacy promise may be

This is the single most important rule in the brand, because a privacy brand caught overclaiming loses its reason to exist.

- Ryan's own deck note: "local-first is not 'no data ever leaves' (that architecture is still being built)." (Deck v0.5, slide 3 notes)
- The privacy flyer's language is the standard: "RyzaLab **reduces unnecessary data leaving the home** by selecting verified devices that can perform their core functions locally."
- The customer one-pager's language is also safe: "Core automations run locally **where the technology allows it**; cloud-dependent features are **disclosed before inclusion**."

Say: "stays in your home where the device supports it", "local where supported", "we name every cloud dependency in writing before you buy", "you choose what records and where".
Do not say: "nothing leaves your home", "never touches the cloud", "100% private", "absolute privacy", "local cloud".

### Audiences

Priority order is PENDING (D-02). All documents agree families come first.

| Audience | Pain in their words | Lead message | Use jargon? |
|---|---|---|---|
| New and expecting parents (Brooklyn first) | Nursery footage on a server, 2 AM lights, five apps, caregiver access | Nursery and night routines that stay home, one app, caregiver access with limits | No |
| Adult children of aging parents | Want to know Mom is up, without a camera in her kitchen | Door and motion check-ins, no cameras. Not a medical device | No |
| Renovators and trade partners (architects, designers, GCs) | Technology decided late, trades solve pieces separately | "Design the home. Design how it works." Decide earlier, hand off a system | Light, trade terms OK |
| Renters | Can't rewire, move often, subscription fatigue | No-wiring setup that moves with you | No |
| Households whose smart home stopped working | Broken after an app update, nobody knows the passwords, installer vanished | We audit what you have and you end up owning it | No |
| DIY Home Assistant users | YAML piling up, updates break things | Rescue, then you own a clean, documented setup | Yes |

### Segment one-liners from approved collateral

- Renter one-pager: "Smarter apartment. Less data leaving it." / "Private home intelligence for NYC renters."
- Family one-pager: "Your family changes fast. Your home can keep up." / "Private home technology for growing families."
- Trade one-pager: "Design the home. Design how it works." / "Bring RyzaLab in before the technology hardens."
- Privacy flyer: "Privacy is designed, then validated." / "Better choices. Local control. Fewer surprises."
- Deck: "The essentials, designed as one. The possibilities, designed around you."

### Calls to action

Primary: **Book a free 15-minute call.** Secondary for warm leads: **Book your Blueprint.** One primary CTA per piece.
Trade audience: **Start with a project fit conversation.**

### What not to position on

- Not against named brands (Google, Amazon, Control4, Crestron). Cite public cases factually, never "they sell your data". (CMO brief, Brand review)
- Not the AI operating model. (Deck v0.5)
- Not Home Assistant as the category. It is the enabler. (Strategy Brief v0.1)

## Voice

Source: Brand review (Oct 2026) voice attributes, Campaign plan tone-by-channel, and the live site.

### Three attributes

| Attribute | We are | We are not | Sounds like |
|---|---|---|---|
| Calm expert | Steady, specific, reassuring | Alarmist or preachy about big tech | "Here is where your camera footage goes today, and where it could go instead." |
| Plain spoken | Outcome first, jargon only when the reader uses it | Dumbed down or vague | "Lights that don't blind you at 2 AM." |
| Warm and candid | Founder led, honest about limits, a little wry | Cute at the expense of clarity | "Nacho the toddler is the stress test." |

### Person

- "We" for the business (services, FAQ, cards).
- "I" only inside Ryan's founder story, newsletter and LinkedIn, signed by Ryan.

### Words

| Use | Avoid |
|---|---|
| RyzaLab | RyzaLabs, Ryza Lab, Ryzalab |
| Blueprint (capital B) | blueprint, Smart Home Blueprint, Get Your Blueprint mixed |
| local first, runs inside your home, local where supported | local cloud |
| reduces what leaves your home, you control who sees it | absolute privacy, 100% secure, unhackable, nothing ever leaves |
| verified devices, RyzaLab tested | certified devices (unless naming the certifier, for example Matter certification by the Connectivity Standards Alliance) |
| home security (locks, cameras, alerts) and privacy (where data goes) as two ideas | "security" alone |
| a full backup and history of every change (family and renter copy) | YAML, GitHub repo, version control, Zigbee, Z-Wave, Thread (fine in DIY and trade copy) |
| works with 2,000+ Home Assistant integrations | 2,000+ integrations (implies they are RyzaLab's) |

### Tone by channel (Campaign plan)

| Channel | Tone |
|---|---|
| Instagram, TikTok, Facebook | Warm and visual. Show the scene, not the hardware ("Bedtime, one tap, nothing leaves the house" must become "Bedtime, one tap, runs inside your home") |
| Reddit, Home Assistant forum | Technical and generous. Full answers, no pitch. Disclose that Ryan runs RyzaLab |
| LinkedIn | Ryan as a risk and data professional explaining what he saw from the inside |
| Google Ads | Direct and intent matched |
| Newsletter | Personal and practical, written as Ryan. Sections: The Automation, Privacy Watch, Ask RyzaLab, From the Lab, one call to action |
| Trade (architects, designers, GCs) | Peer to peer, about coordination and timing, never about gadgets |

### Content rules from Ryan's CMO brief

- No generic AI-written lifestyle content. Publish only what RyzaLab can prove.
- Content should make a specific conversation easier, not become a hiding place from selling.
- Synthetic or AI-generated visuals must be disclosed and reality-checked.

## Proof library

The only external facts and figures RyzaLab content may cite. Each one carries its source as given in the research and brand review documents (Oct 2026). Before publishing a new use of any item, open the source and re-check the wording.

To add a fact: add a row with the exact figure, date, source name and link, and who checked it. Facts not in this table are treated as unsourced by the claim checker.

| ID | Fact (use this wording) | Date | Source | Use for |
|---|---|---|---|---|
| P-01 | The FTC alleged Ring employees and contractors had broad access to customers' videos. Ring paid $5.8 million to settle | May 2023 | FTC; TechCrunch, "Amazon's Ring to pay $5.8M after staff and contractors caught snooping on customer videos" | Camera privacy |
| P-02 | The FTC proposed a $25 million penalty against Amazon over children's Alexa voice recordings | May 2023 | FTC; EPIC, "FTC announces $25 million fine against Amazon for kids' privacy violations" | Voice and children's privacy |
| P-03 | Amazon ended the "Do Not Send Voice Recordings" option on the Echo devices that offered it (Echo Dot 4th Gen, Echo Show 10, Echo Show 15) from March 28, 2025, citing generative AI features that rely on its cloud | 2025-03-28 | TechCrunch, 2025-03-15 | Rented, not owned |
| P-04 | Google ended app and cloud support for 1st and 2nd gen Nest Learning Thermostats on October 25, 2025 | 2025-10-25 | Google; Research doc | Rented, not owned |
| P-05 | A proposed class action, Tsourdinis v. Alphabet Inc. and Google LLC, was filed April 2, 2026 in the Northern District of California over the Nest thermostats. Say "alleges", never "proves" | 2026-04-02 | Research doc (court filing) | Rented, not owned |
| P-06 | Home Assistant went from 1 million to over 2 million active installations in 2024 | 2025-04-16 | Home Assistant blog, "2 million homes strong" (State of the Open Home 2025) | Platform longevity |
| P-07 | 45% of US internet households own at least one core smart home device (excluding speakers and displays); 52% of DIY users report setup or connectivity issues | 2025-07-09 | Parks Associates press release | DIY frustration |
| P-08 | 40% of US internet households rate home technology support appealing | 2025 | Parks Associates, Wi-Fi World Congress USA 2025 | Demand for help |
| P-09 | 72% of consumers say they are concerned about the security of their smart home data | n/d | Parks Associates (via Research doc); confirm the year before use | Privacy concern |
| P-10 | The American Academy of Pediatrics says cardiorespiratory monitors have not been shown to reduce SIDS | n/d | AAP; Lamaze, "Breathing monitors don't prevent SIDS" | Internal guardrail only. Explains why RyzaLab makes no health claims |
| P-11 | The FTC rule banning fake reviews and testimonials took effect October 21, 2024. Penalties can reach $51,744 per violation | 2024-10-21 | Hogan Lovells summary of the FTC final rule | Internal guardrail only |

### RyzaLab's own proof (first party)

| ID | Proof | Status |
|---|---|---|
| R-01 | Ryan's own home as the living lab, labeled as such | Usable |
| R-02 | Offline demo: unplug the router and run the bedtime scene | To be filmed (Campaign plan, Nov 2) |
| R-03 | Privacy architecture flyer: five layers (device, control, network, validation, ownership) and "Privacy you can inspect" metrics | Usable. Strongest proof asset |
| R-04 | Handoff package contents (system map, Operations Guide, change history, Health Score) | Usable |
| R-05 | Case studies | None published yet. Do not reference until they exist with consent |
| R-06 | Client quotes and reviews | None yet. Never draft one. Use `[Client quote with written permission]` |
