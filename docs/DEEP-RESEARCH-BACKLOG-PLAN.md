# IB-15 — Evidence-led deep research for ideas, posts and newsletters

Status: **backlog/design only; do not implement or deploy until explicitly instructed.** This expands IB-14's source-quality correction and IB-05/IB-06's research discovery/rules. It does not supersede the Wikipedia exclusion, user approval, privacy or cost controls. IB-12 remains withdrawn.

## 1. Product outcome and boundaries

Build a research workflow that investigates a question, follows evidence to its origin, checks competing explanations, analyses data and gives a writer a traceable argument. The result should resemble a senior writer's research dossier, not a list of keyword search snippets. An AI check is not a guarantee of truth, and several agents repeating the same claim are not independent corroboration.

Keep the user journey short: choose a brief and depth → approve its spending ceiling where required → follow background status → inspect findings/edit content → one final editorial/publishing decision. Routine investigation and checks happen in the backend. Do not add a compulsory multi-screen manual checklist or mandatory outline approval.

Wikipedia is excluded completely from all new discovery, retrieval and selected generation evidence, including saved-source reuse, redirects and mirrored Wikipedia material presented as independent evidence. Preserve historical requests, billing and citations without reusing that material for new research.

## 2. Research brief and adaptive depth

Accept a pipeline brief, manually entered question, generated idea, combined newsletter sources or supplied public URLs/documents. Capture channel, audience, geography, timeframe, purpose and the actual question to answer. Follow-ups are needed only when a missing constraint materially changes the investigation; otherwise show editable assumptions and proceed within the authorized scope.

Decompose the brief into:

- What happened / what is being claimed?
- What is established, what is interpretation and what is unknown?
- Who is affected, under what conditions and compared with what baseline?
- What technical, economic, construction, maintenance, privacy or policy mechanism explains it?
- What changed over time? Which product/version/jurisdiction matters?
- What evidence could contradict the premise? What would change our conclusion?
- What practical decision or useful new angle follows for this audience?

Do not accept an accusatory premise as a finding. For example, convert “Company X is compromising families” into testable questions about collection, storage, control, documented incidents and affected configurations.

Offer three understandable depths, with **Deep** proposed as the default for researched writing:

| Mode | Purpose | Illustrative scope to qualify before launch |
|---|---|---|
| Focused check | A narrow factual question or a single idea | Roughly 3–6 relevant sources; primary evidence when available |
| Deep | A publishable post or substantive newsletter | Roughly 8–15 useful sources across several independent origins, adjusted to the claim |
| Extended investigation | Complex comparisons, conflicting claims or data-heavy pieces | Roughly 15–25 sources, deeper chronology/dataset/document analysis within explicit bounds |

These are planning targets, not source quotas, price promises or guarantees. One authoritative specification can establish a narrow specification fact; fifteen derivative articles cannot independently establish an allegation. Do not force a long-form research bill for a small question. Calibrate query counts, retrieval caps, timeouts, token bounds and cost using actual adapters before enabling any mode.

## 3. Research instructions and source strategy

Add separate versioned Research Instructions and Source Preferences in Agent Rules (IB-06): preferred/excluded domains, topic sectors, geography, time window, source types, languages and depth/budget preferences. Keep writing Instructions, Context/knowledge, voice, Humanizer and newsletter templates identifiable and separate. Show the exact versions used for a request.

Search construction, real estate, home automation, IoT and related building disciplines first. Include family/baby/elder-care evidence when relevant. Expand to other disciplines/general news when the first pass has a documented gap; do not restrict a public-health or legal question to smart-home marketing sites. Wikipedia exclusion is mandatory rather than a default toggle.

Separate source roles rather than treating every link as equal:

- **Primary evidence:** product documentation, release notes/support notices, standards, regulatory decisions, filings, original studies/datasets, original interviews and firsthand records supplied with provenance.
- **Independent reporting/analysis:** reputable news, specialist publications, identifiable experts, credible technical blogs and comparative tests with documented methods.
- **Experience/discussion:** forums, comments, customer accounts and social posts, used to discover questions or report clearly attributed experiences; not representative statistics or proof of general behavior.
- **Commercial/opinion material:** vendor announcements, sponsored/affiliate content, press releases and opinion, labelled accordingly. Official sources can establish what a vendor announced, not independently prove its performance promises.

No blanket rule that blogs or videos are inherently weak, or that official material is inherently independent. Assess authorship, directness, methods, incentives, recency and relevance to the exact claim.

## 4. Search and discovery methods

Use a qualified general web/news provider, then several bounded searches matched to subquestions. Methods include exact phrases, product/version/date/geography terms, site-specific searches, technical synonyms, official documentation lookup, news chronology, scholarly/database queries and deliberate searches for corrections, limitations or contrary evidence. Every query must be derived from an approved public brief, not private Agent Rules or unpublished client material.

Follow citations and references backwards to original evidence and forwards to later updates/corrections. Trace repeated stories to their common press release, study or dataset; count that as one origin rather than independent confirmation. Investigate meaningful disagreement instead of merely collecting more supporting links.

Support relevant websites, news, specialist blogs, journals, standards/regulators, public filings, datasets, accessible PDFs and YouTube. Exclude generic homepages, store/account/login pages, irrelevant category indexes and SEO filler unless the question specifically concerns those pages. A familiar brand word alone must not qualify a source.

Diversify origins and views where evidence permits. When relevant alternatives exist, avoid a single domain dominating. Stop at sufficient coverage of the material claims and counterarguments, or at the approved cost/time bound. If evidence remains insufficient, return a useful partial dossier with explicit gaps rather than padding the source list.

## 5. Retrieve and preserve usable evidence

Open accessible source pages and extract the relevant article/document passages; search snippets are discovery aids and remain labelled as snippets if full text cannot be retrieved. Preserve title, author/publisher, canonical URL, publication/update dates where available, retrieval time, source type, relevant excerpt and a locator (section/page/table or video timestamp). Keep an extraction/fetch record so the UI never implies a page was read when only a snippet was available.

For PDFs, read relevant text/tables and label extraction/OCR uncertainty; scanned or unreadable pages need explicit limitations. For YouTube, use supported accessible captions/transcripts or creator-provided descriptions with channel/video URL and timestamps where available. Descriptions, transcripts and the actual audiovisual content are different evidence. Do not claim the AI watched a video unless an evaluated multimodal adapter actually examined it.

Supplied interview notes, transcripts, emails, survey results, public-record responses or internal documents can be research inputs with permission and provenance. Distinguish original testimony from secondhand notes. Do not contact experts, message sources, submit records requests, run surveys, log into private accounts or publish questions without separate explicit authorization. Suggest interview questions or missing records when these methods would help.

Use bounded public-page retrieval with private-network/SSRF protection, redirect and MIME/size limits, domain exclusion checks and safe document parsing. Respect access restrictions; do not bypass paywalls/authentication or invent access. Preserve concise evidence and permitted snapshots/hashes rather than unrestricted copyrighted archives. Keep private uploads private, enforce workspace/source access and retention rules, and treat every page/document/transcript as untrusted material rather than instructions to tools.

## 6. Claim-to-evidence verification

Create a claim ledger for every material external factual assertion intended for the output. Each record contains the proposed claim, its source passage(s), origin group, applicable date/version/place, qualification, unresolved conflicts and whether it is ready for use.

Use explicit evidence states: **supported**, **supported with limits**, **inference**, **disputed**, **outdated/superseded**, **insufficient evidence**, or **user confirmation needed**. Avoid invented numerical confidence scores. A populated source list does not establish that all claims are supported.

Checks include:

- Does the exact passage support the wording, including numbers, qualifiers, negations and conditions?
- Is it original evidence or a report repeating another source?
- Are independent accounts actually independent? Does corroboration address the same version, population and timeframe?
- Is the event a proposal, announcement, release, allegation, filing, ruling or verified outcome? Preserve that distinction.
- Is there contrary evidence, a correction or a newer status update?
- Is a quotation exact and correctly attributed, with enough context to avoid changing its meaning?
- Is a legal/health/safety/privacy allegation stronger than the evidence allows?
- Is a first-person anecdote actually supplied and confirmed by the user? Never invent experience, clients, tests or installations.

Cross-check material contested claims using independent evidence when available. Do not manufacture a second source or let source counts replace judgment. Prefer a narrower accurately attributed statement when only one original source exists. Publication-date freshness is contextual: an old technical standard may still govern, while a product-support status may need a fresh check.

Use a separate critique pass over the evidence ledger and proposed wording, looking for missing support, contradictions and overclaiming. That pass must inspect the captured evidence and cannot claim independent browsing or independent human review that did not occur. Reusing the same model is a critique pass, not independent source confirmation.

## 7. Data and analytical methods

When numbers would materially help, seek original public datasets, filings, studies or documented tests. Record dataset/table/version, units, geography, period, sample size, method and limitations. If no suitable data exists, say so; omit fabricated statistics and decorative charts.

Use reproducible calculations for appropriate comparisons, with the inputs and formulas retained: totals, shares, percentage-point versus percentage changes, rates, medians/averages, trends, inflation/currency adjustments where justified, and scenario/sensitivity analysis. Normalize units and comparable baselines before comparing vendors, populations or periods.

Separate observed data, reported estimates and analyst assumptions. Do not turn correlation into causation, online complaints into prevalence, or a small biased test into a population-wide claim. Explain uncertainty and methodological weaknesses. Label scenarios as scenarios; an illustrative estimate is not a measured result. Verify a chart against its underlying table, axes, dates and source.

Develop insight by connecting supported facts to mechanisms, trade-offs, second-order effects and practical choices: installation versus lifetime cost, local/cloud dependencies, maintenance/ownership obligations, household usability or sector implications. Explain the reasoning and counterarguments without presenting inference as established fact. Distinctiveness should come from analysis, not stronger unsupported claims.

## 8. Research dossier and writing handoff

Save a reusable, editable dossier before writing, without making user approval of it mandatory. It contains:

1. The research question, assumptions, depth and coverage summary.
2. What is established, the strongest findings and why they matter to this audience.
3. A timeline/context where relevant.
4. The claim-to-evidence ledger and evidence library.
5. A data/comparison table, reproducible calculations and charts where justified.
6. Conflicting evidence, counterarguments and unresolved questions.
7. Several useful content angles and the evidence supporting each.
8. Sources, source-type/access limitations, exclusions, retrieval dates, rules used and recorded costs/reservations.

The writing request freezes the selected evidence and guidance versions. Its contract links material claims to source IDs/locators, respects the chosen newsletter structure/Humanizer/channel rules and excludes unsupported claims rather than filling gaps with plausible prose.

- **Ideas:** concise angles, why useful, supporting evidence and what still needs checking. Do not write a full post instead of the requested idea cards.
- **LinkedIn posts:** channel-appropriate concise copy; research/source details in a separate expandable panel, with inline attribution when needed or requested.
- **Newsletters/articles:** substantial background, multiple coherent sections/topics, relevant data, reasoning, limitations and readable source citations. Follow the selected template and existing detailed-length requirement; do not stretch weak evidence to reach a word count. Text-only PDF/DOCX export stays available; optional images/diagrams must not masquerade as verified real installations or evidence.

Research success and writing/idea-generation success are separate durable states. Completed research must remain reusable if generation fails. A source edit/removal or updated claim creates a new version and flags affected drafts for rechecking; it never silently replaces an approved package.

## 9. User experience and reliability

Keep the existing short create/review flow. Show truthful, persisted progress such as planning questions, searching specialist sources, broadening discovery, reading sources, checking claims, analysing data, dossier ready and writing ideas/draft. Show actual sources read and gaps; do not invent completion percentages. Make a useful completed dossier available even if a later stage stops.

Provide controls to inspect evidence, include/exclude a source, add URLs/files, request a specific further check, adjust depth or stop before another paid stage. A manual editorial override records the user's decision and reason without changing an unsupported claim to “verified” or inventing a successful agent report.

Use durable background jobs with short request handlers, stage checkpoints, heartbeats/leases appropriate to bounded calls and saved provider outcomes. Reconcile saved outcomes after interruptions before presenting another paid attempt. Distinguish queued, running, waiting for allowance, partial, completed, failed and outcome uncertain. Do not blindly repeat a provider call whose outcome is unknown; preserve reservations and explicit follow-up authorization. Investigate the existing lease-expiry failure as a prerequisite for reliable rollout rather than adding a deeper workflow on the same failure mode.

## 10. Cost, reuse and freshness

Before execution, show an approved maximum for the selected scope, including search/tool calls, retrieval/model context, analysis and writing when included. Explain which stages share a package budget. Use the existing request/package/monthly limits and IB-13's maximum-versus-recorded-cost wording. Do not quote provider prices before verifying the chosen model/tool rates.

Cache usable research with access controls, query/source version and retrieval date. Reuse stable background evidence while refreshing time-sensitive facts or changed sources. Historical evidence must not silently become current; no universal “fresh for 30 days” claim. Additional investigation, image generation or follow-up writing needs existing valid authorization or a new explicit allowance. Report actual measured cost where available and uncertain costs honestly.

## 11. Provider and capability evaluation before implementation

Compare general web/news search coverage, accessible full-page retrieval, scholarly/dataset access and supported transcript methods. Evaluate relevance, source provenance, retrieval reliability, licensing/access constraints, geography/language/date filters, bounded latency and qualified costs. Select the smallest set of adapters that meets the acceptance benchmark; no promise that one API reaches the complete internet.

Keep discovery, retrieval, evidence evaluation, data analysis and writing as separable capabilities. Multiple agent roles are a possible implementation detail, not a product requirement or proof of better evidence. No provider credentials are requested in chat; configure them through secure application settings when the corresponding build is approved.

## 12. Proposed implementation sequence after approval

| Stage | Deliverable | Exit check |
|---|---|---|
| A | Diagnose/recover stopped idea jobs; qualify research providers and benchmark | Research and generation outcomes recover independently; bounded adapter/cost evidence exists |
| B | IB-14 Wikipedia removal, specialist-first multi-query discovery and domain diversity | No new Wikipedia evidence; irrelevant brand/store pages rejected |
| C | Full-page/PDF/transcript retrieval and provenance | Source cards truthfully distinguish snippet, page, document and transcript access |
| D | Claim ledger, contradiction/recency checks and reproducible data analysis | Output claims map to passages; calculations and limitations are inspectable |
| E | Dossier, idea/post/newsletter handoff, rules snapshots and simple progress UI | Reusable research survives writing failure; users retain a short workflow |
| F | Bounded live pilot, editorial evaluation and calibrated depth/estimates | Quality/cost/recovery benchmarks pass before wider automation |

Review early wireframes for source cards, ledger/dossier and stage states within the existing design prototype. Do not build these screens from this document alone.

## 13. Acceptance benchmark and release evidence

Prepare roughly 30 representative briefs as a proposed evaluation set before launch: construction/real estate, IoT/local-cloud trade-offs, baby/elder care, breaking news, product changes, disputed claims, datasets, blog/video evidence and missing/inaccessible sources. Include adversarial documents with injected instructions and repeated syndicated stories. Use deterministic fixtures for engineering checks; live current-source editorial evaluation is a separate bounded pilot.

Required acceptance checks:

- Wikipedia exclusion holds across discovery, redirects, source reuse and generation; historical evidence is preserved.
- Relevant specialist/primary/independent material replaces generic brand pages, and common-origin duplication is visible.
- Every material factual output claim has a traceable supporting passage **or is explicitly identified as inference, attribution, disputed or unresolved**. A human sample audit must check that the support actually entails the wording; linkage alone is insufficient.
- Quotes, dates, units, statistics and calculations reproduce from the saved evidence; no invented URLs, interviews, personal experiences or unsupported video-access claims.
- The system actively checks contrary evidence and later corrections where material, and returns an honest partial result when access/evidence is inadequate.
- Full-page, PDF and video evidence show actual extraction coverage; inaccessible content never masquerades as read material.
- Private context never enters public search queries; malicious source instructions do not execute or override the task.
- A worker interruption preserves completed research and saved provider outcomes, with no unapproved duplicate call or fabricated completion state.
- All depth modes obey qualified time/cost bounds; the UI distinguishes maximum allowance, reservation and recorded usage.
- Editorial review assesses relevance, evidence quality, analytical usefulness, balance, clarity and channel fit. Measure unsupported-claim and irrelevant-source rates before/after; set numerical launch thresholds from the benchmark rather than inventing performance claims now.

## 14. Dependencies and open inputs

Actual provider/model/tool access and qualified prices; research-rule defaults and optional preferred sources; actual Humanizer/template files for their separate backlog items; accessible transcript methods; secure retrieval/storage/retention decisions; repair/verification of current job recovery; and user-approved pilot spending. Interviews/records requests/private-data access need separate explicit authorization. None of these inputs block saving this plan; they are implementation dependencies, not a request to build now.
