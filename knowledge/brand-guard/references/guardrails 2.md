# RyzaLab: guardrails

Rules every piece of RyzaLab content must pass. The automated checker (`scripts/claim_check.py`) catches the wording problems. The judgment checks below need a human or Claude to read the piece. This is not legal advice. Family pages, health disclaimers and the client consent form go to a lawyer before launch (Campaign plan).

Severity:
- **BLOCK**: cannot publish until fixed.
- **FIX**: fix before publishing unless Ryan signs off on the exception.
- **CHECK**: a person confirms it is true and approved.

## 1. Privacy and security promises (BLOCK)

No guarantees. "Absolute", "100% secure", "unhackable", "completely private", "nothing ever leaves" create deception risk under the FTC Act and contradict Ryan's own note that the fully local architecture is still being built. Describe the setup instead: where data is stored, who can reach it, which devices still need a cloud service.

## 2. Health and safety claims (BLOCK)

Never imply a RyzaLab setup prevents SIDS, monitors breathing, detects falls reliably, keeps a child or parent safe, or replaces supervision. Family and elder care content carries the line: "RyzaLab systems are not medical devices and are not a substitute for adult supervision." (Family one-pager v0.1)

## 3. Competitors (BLOCK)

Never say or imply that a named company sells customer data, spies, or is unsafe. Cite public cases by name, date and source from `proof-library.md`, using the same verbs as the source ("alleged", "settled", "proposed a penalty"). Comparative cost claims about other installers need a source (for example the "$25k" and "$40,000" figures).

## 4. Reviews and testimonials (BLOCK)

The FTC rule in force since October 21, 2024 bans fake or AI-written reviews, undisclosed reviews from insiders, friends or family, and incentives tied to a positive rating. So:
- Never draft a review, testimonial or client quote. Use `[Client quote with written permission]`.
- Review requests ask for an honest review, never a 5-star one, and are never tied to a credit or discount.
- The referral credit is for referrals, not reviews.

## 5. Sponsored and creator content (BLOCK)

Every paid or gifted creator post starts with a clear disclosure such as "#ad" or "Paid partnership with RyzaLab". Affiliate links in the gift guide are disclosed next to the link.

## 6. Unapproved offers and prices (BLOCK)

Only prices marked LIVE in `company.md` go in public copy. PENDING prices (Nursery Setup $1,500, Family Core $3,500, Blueprint $500 to $750, Blueprint credit, Rescue at $250) are blocked until Ryan approves them and the website matches.

## 7. Traction and proof (BLOCK)

No customer counts, "trusted by", "our clients", "families love", case studies or results that do not exist yet. Ryan's own home is allowed if labeled as his home.

## 8. Certification language (FIX)

Don't say "certified" unless naming who certifies. Use "verified" or "RyzaLab tested". "Certified Stack" is an internal term.

## 9. Unsourced numbers (CHECK)

Every statistic, percentage or dollar figure that isn't a RyzaLab price must match a row in `proof-library.md`.

## 10. Client homes and people (BLOCK)

Filming or photographing a client home needs signed consent. Blur faces, addresses, house numbers, screens and anything that identifies the home. Ryan's home is the main stage. No names, addresses or identifying details of leads or clients in any content or in this repository.

## 11. Electrical work (FIX)

Say plainly that a licensed electrician partner handles switch and wiring work where required. RyzaLab does not do mains electrical work.

## 12. Jargon by audience (FIX)

Family, elder care and renter copy avoids YAML, GitHub, repository, version control, VLAN, Zigbee, Z-Wave, Thread and MQTT. Fine in DIY and trade copy.

## 13. Brand consistency (FIX)

RyzaLab (never RyzaLabs), Blueprint with a capital B, one support plan name everywhere (pending D-06), no "local cloud", no "Optional but popular", no "V2.0" in customer copy, "2,000+ Home Assistant integrations" not "2,000+ integrations".

## 14. Internal model stays internal (FIX)

No "AI agent fleet", "AI-powered installer" or "replacing the human integrator" in customer copy. The AI operating model is delivery leverage, not the promise.

## 15. Email law (CHECK)

Marketing emails carry an unsubscribe link and RyzaLab's mailing address (Kit adds both).
