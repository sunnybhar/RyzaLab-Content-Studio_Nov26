# GOAL: RyzaLab Media Editorial System

**Status:** Adopted 2026-10-02 as v0.2 (from the 2026-09-29 v0.1 handoff)  
**As of:** 2026-09-29  
**Owner:** Founder / Managing Editor  
**Scope:** RyzaLab Media editorial mission, editorial calendar, distribution, measurement, and bounded AI assistance

## Outcome

Build a small, evidence-led RyzaLab Media operation that can repeatedly:

1. investigate consequential consumer technology questions;
2. publish original or follow-up reporting that is useful on its own;
3. distribute each content atom natively across the channels that fit it;
4. grow owned audience and qualified demand;
5. measure whether the work contributes to leads, booked consultations, and revenue;
6. reduce founder coordination overhead as the workflow matures.

RyzaLab Media may cover the broader territory associated with investigative technology publications such as 404 Media: technology, cybersecurity, consumer rights, surveillance, privacy, the internet, consumer IoT, networks, telemetry, data brokers, government access to commercial data, and AI in consumer products.

404 Media is a benchmark for scope and investigative posture, not a writing style to imitate.

## North-star business outcome

**Primary business metric:** attributable media revenue.

Supporting funnel:

`distribution -> attention -> owned intent -> qualified editorial lead -> booked consultation -> paid engagement -> attributable revenue`

A qualified editorial lead keeps the existing RyzaLab definition: a person not already in the active pipeline who can be credibly attributed to the content and expresses a concrete project need, requests a consultation, introduces a qualified prospect, or starts a substantive conversation with plausible buying or partnership intent. Likes and generic comments are not leads.

## Key decisions and metric wiring

| Decision / strategy | Key metric | Telemetry / evidence | Experiment / ledger |
|---|---|---|---|
| Expand Media beyond smart-home marketing into investigative technology reporting | Qualified editorial leads and attributable media revenue | CRM attribution, booking source, explicit self-report | Existing experiment system; proposed child `EXP-GTM-media-calendar-pilot` |
| Use one researched content atom across several channel-native derivatives | Founder active minutes per accepted distribution cycle | Time log per content atom and distribution cycle | Child pilot, compared with measured manual baseline |
| Use LinkedIn as the primary professional discovery channel | External-link visits and substantive inbound conversations per distribution | LinkedIn native analytics and captured post IDs | Existing editorial observation process for LinkedIn |
| Use Kit as the owned recurring distribution layer | Unique click rate, net subscribers, qualified replies | Kit broadcast analytics and subscriber counts | Child pilot checkpoint |
| Use Reddit for reporting intelligence and technical community participation | Substantive-response rate and moderation removals | Reddit post/comment URLs and native metrics | Child pilot checkpoint |
| Use Facebook selectively rather than as the editorial center | Owned-intent events from Facebook distributions | Facebook native analytics and tagged links when observable | Child pilot checkpoint |
| Add `RzL Media Editorial Calendar` as an operating surface, not a new app | Founder active minutes per accepted distribution cycle | Calendar timestamps plus founder time log | Pilot continuation target: at least 25% lower founder/expert time on a comparable repeated workflow, guardrails intact |
| Use AI as research, organization, countercase, transcript, and repurposing assistance | Founder/editor minutes saved per accepted content atom | time log, accepted/rejected draft state, QA findings | Existing experiment ledger; no standalone AI-content experiment unless a distinct hypothesis is tested |

The 25% founder/expert time reduction is a RyzaLab strategy target for comparable repeated workflows. It is not a universal editorial benchmark and is not an achieved result.

## Guardrails

- Evidence precedes prose. Keep the existing Lock 1 -> research -> Lock 2 -> prose sequence.
- No unresolved thesis-critical `RED_RESEARCH` or `RED_REMOVE` claim may release.
- RyzaLab commercial brand rules govern claims about RyzaLab products and services. They do not limit the subjects RyzaLab Media may investigate.
- Research must be able to change or kill the starting thesis.
- AI output is never evidence by itself.
- No customer/private material enters personal AI outside the existing Sunny/RyzaLab information boundary.
- Founder retains external publication authority.
- The calendar is an operating view, not a second evidence ledger.
- Do not build a custom calendar application before the Notion calendar pilot demonstrates a real integration or coordination failure.

## Exit condition

The goal is met when RyzaLab can run the editorial workflow across a sustained pilot with:

- defensible, original reporting;
- channel-native distribution;
- attributable measurement through the existing experiment system;
- at least one credible business-outcome signal or a clear evidence-based no-go;
- measured founder effort sufficient to decide whether the calendar/AI workflow reduces coordination cost;
- no new governance platform required to keep the system operating.
