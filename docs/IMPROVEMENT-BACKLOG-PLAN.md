# RyzaLab Content Studio — improvement backlog and proposed build plan

Current instruction (November 7, 2026): **backlog capture only. Do not implement or deploy further changes until the user explicitly says to build.** Earlier Build 1 authorization is historical, not authorization to start this new spacing work or subsequent builds.

Status update: the user approved building and deploying after reviewing the wireframes, then accepted the first-release scope: Calendar import/template and Existing Pipeline (Build 1). Build 1 is implemented and verified locally for v0.3.28; production rollout verification is pending. Remaining builds stay queued for subsequent releases; provider credentials, private guidance files and actual publishing approvals are still required where applicable. No operational calendar has been imported and no paid provider call has been made during development.

## Complete master backlog — both user request lists

This is the master plan for **all improvement items in the earlier seven-item list and the later four-item expansion**. Earlier requirements are retained, not replaced by the calendar spreadsheet request. The earlier list's item 8 was blank; no requirement has been invented for it. The ten entries below separate combined requirements so each can be tracked and reviewed. Build 1 (IB-03 and IB-04) is implemented and locally verified for v0.3.28; other items remain planned. Existing basic capabilities, such as PDF/DOCX export, are a baseline to improve rather than proof that the requested enhancement is finished.

| ID | Complete requested improvement | Origin | Proposed build | Status |
|---|---|---|---|---|
| IB-01 | Add an image-generation API key/connection for OpenAI or Google's supported Nano Banana/Gemini image model. Provide image generation inside **both LinkedIn post and Newsletter creation**, including content-based/custom prompts, preview, attachment/placement, replacement and optional export inclusion. | Earlier #1; earlier newsletter image requirements | 4 | Planned |
| IB-02 | Upload, edit, download and select a **newsletter structure/format template**. Generate the final newsletter in that structure, with image slots and a matching visual PDF/DOCX layout. Preserve detailed background, evidence, reasoning, sources and the existing 1,200–1,600-word / at-least-2–3-page target, subject to the chosen template and actual export pagination. Text-only export remains available. | Earlier #2 and #6.1; expanded #4; previous newsletter requirements | 3, then image integration in 4 | Planned enhancement |
| IB-03 | Upload an existing **Excel content calendar** and provide a downloadable XLSX template based on the supplied workbook. Preview/map columns, import dates/times/platforms, retain history and detect duplicates. Import actual entries, not empty formatted spreadsheet rows. | Earlier #3; expanded #2 | 1 | Implemented v0.3.28; rollout verification pending |
| IB-04 | Create **Existing Pipeline** with its own header and searchable dropdown in **both Ideas and Create**, for **LinkedIn posts and Newsletters**. Imported titles and angles become linked pipeline briefs/calendar entries. Start in three ways: imported brief, AI or manual. From a pipeline brief, either generate ideas or **write content directly**. | Earlier #3.1; expanded #2 | 1 | Implemented v0.3.28; rollout verification pending |
| IB-05 | Replace the apparent Wikipedia-first experience with **general web/news search and supplied website/link retrieval**. Use relevant accessible websites and other sources; retain source URLs, dates, excerpts and coverage. Wikipedia is optional supplementary background. | Earlier #4; expanded #3 | 2 | Planned |
| IB-06 | Add separately uploadable/editable **Research Instructions and Source Preferences**. Search construction, real estate, home automation, IoT and related specialist sectors first; include baby-care/elder-care contexts where relevant; then broaden to other areas when needed. Make preferred/excluded websites, relevance and widening/fallback behavior visible. | Earlier #4, including sector examples; expanded #3 | 2 | Planned |
| IB-07 | Obtain **Ryan's Humanizer** and upload it as distinct writing instruction/skill guidance used for content generation. Keep it identifiable, editable, versioned and scoped to the intended channels. Do not replace it with an unrelated public prompt or bury it within research settings. | Earlier #5 | 2 | Planned; Ryan's file/link needed |
| IB-08 | Create **one multi-topic newsletter** from multiple existing/generated/old ideas, old posts or saved content, pipeline briefs, newly entered ideas, pasted text and **PDF/DOCX uploads**. Let users select/remove/reorder inputs, consolidate them coherently, preserve sources and apply IB-02's template and approved images. | Earlier #6; expanded #4 | 3, then image integration in 4 | Planned |
| IB-09 | Provide **LinkedIn API connection/setup guidance and OAuth**. Retain a **prepare-only mode**: put/prepare the final post without submitting it if the granted API supports native drafts; otherwise use an honest Studio draft/copy/open-LinkedIn handoff. Never publish merely to simulate saving a draft. | Earlier #7 | 5 | Planned; capability verification needed |
| IB-10 | Add **specific date/time/timezone and social platform/account scheduling**. Editor modifies/finalizes content; agent prepares the publishing package; **user approves publication of the exact package and schedule**; a supported publisher releases it at the approved time and records the actual result. Edits require reapproval; uncertain API outcomes must not produce duplicate posts. Prepare-only IB-09 remains a separate available mode. | Expanded #1; extends rather than deletes earlier #7 | 5 | Planned; provider/platform access needed |

## New feedback pipeline — awaiting explicit build instruction

| ID | Item | Priority | Status |
|---|---|---|---|
| IB-11 | Consistent spacing between sections throughout Studio, including the Calendar import/pipeline layout shown in the user's screenshot. | High — usability | Queued; do not build |
| IB-12 | Show only the imported brief title in Existing Pipeline dropdown options; remove appended date, channel and other metadata from the option label. | High — usability | Queued; do not build |

### IB-11 — consistent section spacing across Studio

User report: separate sections touch or appear crowded. Apply a consistent spacing system everywhere, rather than fixing Calendar alone.

Scope when authorized:

- Add clear vertical gaps between independent panels, section headings, toolbars, notices, forms and action groups. Keep sensible internal padding within each section.
- Start with the screenshot's Calendar sequence: channel tabs → upload/import section → Imported pipeline → month/navigation toolbar → publishing/timezone notice → calendar grid or agenda. These boundaries must remain visibly separate with import/history expanded or collapsed.
- Space import headings, explanatory copy, file controls, import history and pipeline brief cards so their relationships are easy to scan.
- Audit the same boundaries across Home, Ideas, Create/editors, Reviews, Library, Agent Rules, Workflow settings, AI & budgets, People/access, Analytics and Operations, including dialogs and collapsible sections.
- Use shared spacing values and responsive layout rules; avoid per-page patches, doubled gaps from nested panels, and excessive whitespace on mobile.

Acceptance when built:

1. Adjacent independent section borders never touch in the Calendar example or other audited pages.
2. Section separation and internal padding follow one consistent visual rhythm on desktop and mobile.
3. Expanded/collapsed panels, empty/error/loading states and long imported titles preserve readable spacing without horizontal overflow or clipped controls.
4. Before/after screenshots demonstrate the Calendar correction and representative Ideas, editor, Agent Rules and AI/budgets screens.
5. Existing content, import data, AI requests, review decisions and publication behavior are unaffected.

The Calendar screenshot supplied with the spacing report supports IB-11. The user subsequently supplied a separate written item 2 and dropdown screenshot; this is tracked independently as IB-12 below. No layout edits, feature code, import operations or deployment are authorized by these backlog entries.

### IB-12 — title-only imported brief dropdowns (user feedback item 2)

User request: imported brief options must show only their title, without automatically appended date or LinkedIn/channel text.

Current cause verified read-only: the idea composer's Existing Pipeline option renders `title · plannedDate (or Unscheduled) · channel`. This is display-label formatting; the saved title and the Topic / Brief field are not modified by that concatenation.

Scope when authorized:

- Render only the original saved title in imported-brief dropdown options in Ideas, the manual/AI idea composer and Create. Remove automatically prepended/appended IDs, dates, Unscheduled labels and channel names from the option text.
- Keep date, timezone, channel and source details in the separate selected-brief details area and Calendar, rather than inside the title label.
- Keep stable internal IDs as option values so duplicate titles still select the correct brief. If disambiguation is needed, use separate details or filters without changing the title text.
- Do not strip meaningful dates or platform names that were actually part of the original uploaded title; remove only UI-added metadata.

Acceptance when built: options match the saved title exactly; selection prefills the original title without metadata; the correct brief/source/date/channel remains linked; both LinkedIn and Newsletter entry paths work; saved records and calendar dates are unchanged.

Status: queued, documentation only. Wait for the user's explicit build instruction.


### Original-list completeness check

- Earlier #1 — image key and images for posts/newsletters → **IB-01**.
- Earlier #2 — uploaded newsletter structure/format and final images → **IB-02 + IB-01**.
- Earlier #3 and #3.1 — uploaded calendar, dated entries, brief dropdown and AI/manual/imported starting points → **IB-03 + IB-04**.
- Earlier #4 — broader websites/links, research instructions and sector examples → **IB-05 + IB-06**.
- Earlier #5 — Ryan's Humanizer as writing instructions → **IB-07**, independently tracked.
- Earlier #6 and #6.1 — combine generated/manual ideas into a templated newsletter → **IB-08 + IB-02**.
- Earlier #7 — connect LinkedIn and prepare without submitting → **IB-09**, independently tracked.
- Expanded #1 — editor finalization, date/time/platform, user-approved publishing → **IB-10**.
- Expanded #2 — Excel template and Existing Pipeline in Ideas/Create → **IB-03 + IB-04**.
- Expanded #3 — general web search, primary sectors then wider research → **IB-05 + IB-06**.
- Expanded #4 — old posts/ideas, text, PDF and DOCX combined into one newsletter → **IB-08 + IB-02**.

No earlier item is cancelled, marked completed or silently replaced by this grouping. The five builds below are delivery phases, **not the number of backlog requirements**.

## Proposed sequence

| Build | Scope | Reviewable outcome |
|---|---|---|
| 1 | Excel calendar import, downloadable template and Existing Pipeline | One imported brief appears on the correct calendar date and is available in both Ideas and Create, without duplicate records. |
| 2 | Sector-first general web research, research rules and Humanizer | Relevant source selection and the exact research/writing rules used are visible for a test topic. |
| 3 | Newsletter template/layout upload and multi-source assembly | One newsletter combines selected ideas, posts and uploaded text/PDF/DOCX in the chosen structure, with citations and image placeholders. |
| 4 | OpenAI or Google image generation and document placement | An explicitly requested image can be generated/selected for a LinkedIn post or newsletter and included optionally in PDF/DOCX exports. |
| 5 | Social OAuth, approval-controlled scheduling and publishing | An editor finalizes a package, a user approves that exact version/destination/time, and a supported publisher executes once at the scheduled time and records the actual outcome. |

Before enabling additional paid automation, verify the existing v0.3.27writing/review recovery path on live samples. This is an acceptance prerequisite, not permission to run new paid samples now. Each build needs a small preview/review and acceptance check before the next build; no build starts from this document alone.

## 1. Calendar upload, template and Existing Pipeline

Reference workbook inspected as data: RyzaLab Content Calendar v2.2 (2026-10-09, Apple-LG approved).xlsx. Four sheets: Calendar, How It Works, Content Ideas, Change Log. Calendar has19titled entries, including13LinkedIn-only rows,5combined Website+LinkedIn rows and1website-only row. The workbook has many preformatted/formula rows; these are not hundreds of actual briefs. The workbook uses the default Excel1900date system and ET date/time columns. Document statements, filenames, approval notes and source-check labels are not treated as instructions to this assistant or independently verified facts.

### Template design

Provide a downloadable XLSX template based on the supplied workbook, with clear editable columns and a separate Instructions sheet. Two importable sheets:

- Calendar: stable Brief ID, Date, Time, Timezone (default America/New_York), Channel, Account/publication, Format, Working title, Angle/brief, Audience, Source URLs, Planned status, Owner/editor, Existing post copy, Package/campaign, Notes.
- Existing Pipeline: stable Brief ID, Title, Angle/brief, Sector/topic, Audience, Channel, Intended format, Preferred date/time (optional), Source URLs, Related content IDs/URLs, Priority and Notes. Unscheduled ideas stay unscheduled until the user sets a date.

Retain optional migration columns for original Week/Day/Slot, content atom, distribution ID, UTM values, tagged link, previous approval date/snapshot, publication URL/native ID and performance figures. Their imported provenance is preserved. Technical tracking columns should not be mandatory for a normal brief.

Mappings from the current Calendar: Date -> planned date; Time (ET) -> local planned time; Channel / account -> platform plus exact destination; Working title -> pipeline title; Angle / notes -> brief; Post copy (approved) -> optional existing draft text; Drafts / Final review -> reviewable owner/editor mapping; Status -> imported status; Canonical Note URL -> source/canonical URL, not a restored Notes channel; Distribution ID and metrics -> optional tracking/history. Content Ideas maps Hook / working title, Ryan's angle, news description/date and Link into unscheduled pipeline briefs. Source-check text remains labelled as imported notes.

### Import flow and behavior

1. Upload XLSX (CSV can remain an alternative). Parse values and cached dates; do not execute macros, formulas or external workbook links.
2. Select sheets, map columns and preview valid/invalid rows. Show destination, timezone and original row number.
3. Ignore empty/formatted-only rows. Detect Excel date serials, time fractions, explicit scheduled datetimes and DST ambiguity. Conflicting date fields or missing times need review rather than guessed scheduling.
4. Split combined Website+LinkedIn destinations into linked proposed records for user review. Website-only records remain explicitly mapped historical/reference items or skipped; they do not re-enable retired channels. Unknown platforms require mapping or exclusion.
5. Confirm import. Create linked planned calendar entries and pipeline briefs. Published rows can be retained as imported history, not queued again. Spreadsheet approval/fact-check labels do not bypass Studio approval or source checks.
6. Use stable Brief IDs and import/source row identities to detect duplicates. Re-upload previews updates; never silently overwrite drafts, approved packages or live publication records.

### User starting points

Both Ideas and Create, for LinkedIn and Newsletter, show an **Existing Pipeline** header and searchable dropdown. Each option shows title, angle summary, channel and planned date when available. The user can:

- Select a pipeline brief -> generate additional ideas using that brief.
- Select a pipeline brief -> write content directly, without an intermediate idea-generation request.
- Generate with AI from a new brief.
- Start manually.

All derivatives retain the originating Brief ID, sources and planned date. Editing a brief is distinct from replacing existing generated content. Calendar and dropdowns reference the same brief rather than duplicate copies.

Acceptance: import a mixed sample containing dated/undated ideas, existing copy, a published entry, combined destinations, blank rows and duplicate IDs. Verify calendar placement, both dropdowns, direct-to-writing, original source links, update preview and no automatic publishing/AI spending.

## 2. General web research and sector priority (IB-05 / IB-06)

Current code attempts web/news discovery alongside Wikipedia and Crossref; the user's observed results are not meeting the required breadth/relevance. The improvement must make general web search first-class and show provider coverage/failures instead of silently appearing Wikipedia-only.

Add Research Instructions and Source Preferences under Agent Rules, separately editable/uploadable/downloadable. Primary sectors: construction, real estate, home automation, IoT and adjacent building/smart-home disciplines. Support baby-care/elder-care contexts when relevant to the brief. Let the user configure preferred/excluded domains, time window, language, geography, source type and supplied URLs. Existing channel writing/knowledge/voice rules remain separate from research rules.

Search in two explicit passes:

1. Sector-first: official product/technical documentation, standards/regulatory bodies, research and credible specialist industry sites matching the brief and audience. Evaluate relevance before accepting excerpts.
2. Wider discovery: broaden to general news, other disciplines and background material only when sector coverage is insufficient or the user requests it. Keep relevance ranking; do not fill a source list with unrelated matches. Wikipedia is optional supplementary background, not a required/preferred starting point.

Choose/evaluate a general web/news search provider based on index coverage, available page retrieval, citation quality, per-request bounds and cost. Supplied URLs need a bounded safe public-page reader (including redirects/content limits and private-network protection). Accessible website text may be used with source attribution; private/paywalled/unavailable pages need an honest coverage message. Do not claim that a search index reaches every page on the internet. Uploaded private instructions never become public search queries.

Each result retains title, domain, URL, date when available, excerpt, relevance and retrieval time. The generation step distinguishes sourced claims, interpretation and missing evidence. Conflicting sources or sensitive baby/elder health claims require appropriate evidence rather than invented certainty. Show the actual sector/wider search coverage and fallback reason.

Humanizer is a separate writing-guidance backlog item, **IB-07 / section 6**, not a research instruction.

Acceptance: a construction/smart-home brief produces relevant specialist web sources without relying on Wikipedia; insufficient coverage visibly triggers wider search; a supplied public URL is traceable; inaccessible pages and missing facts are not fabricated.

## 3. Newsletter structure and multi-source creation

Add distinct upload/edit/download controls for (a) content structure and writing rules, and (b) visual/export layout. Initial formats: Markdown, DOCX and pasted text; PDF can be reference material with extraction limitations shown. The selected template defines section order, headings, introduction, recurring sections, summaries/CTA, source placement and optional image slots. The layout controls fonts, spacing, margins, headers/footers and image placement in PDF/DOCX. Provide a preview and store versioned snapshots of the template used.

Newsletter input is a collection, not one item. Users can combine:

- Multiple existing ideas, including old generated ideas.
- Existing posts/drafts or approved post snapshots (clearly distinguished).
- Imported pipeline briefs.
- Multiple pasted text items and uploaded PDF/DOCX source documents.

Show a source basket with item title, origin/version, selected excerpts and remove/reorder controls. Preserve originals; do not rewrite them as a side effect. Distinguish a published post's URL/version from an editable draft. Scanned PDFs may require OCR; missing extraction must be reported.

Before generation, support an optional editable combined-outline preview mapped into the selected template: shared theme, background, several distinct stories/sections, evidence, practical implications and conclusion. Merge repetitions, identify contradictions/gaps and retain provenance for each section. Do not simply concatenate several posts or fabricate links between unrelated topics. Allow the user to refine the theme/order or exclude an item.

Final output follows the chosen structure, contains the selected topics/ideas, cites actual supplied/retrieved sources and includes approved images in the designated slots. Keep length configurable with the current 1,200–1,600-word detailed-newsletter default and the requested minimum 2–3-page target. Verify actual page count using the selected export layout rather than assuming a word count guarantees pagination. Include substantive background, relevant data/evidence, reasoning, implications and sources; do not pad the length with invented material. Allow text-only generation and downloads without images. Approved image generation can follow the written draft as a separate bounded action.

Acceptance: combine at least two old ideas, an existing post and an uploaded source into one coherent newsletter; verify section mapping, no loss of source versions, no invented supporting data, citations, PDF/DOCX structure and optional image positions.

## 4. Image-generation providers and placement

Add encrypted image-provider connections separate from Claude writing: OpenAI or an available supported Google Gemini image model (verify the exact current model/API associated with Nano Banana, access and pricing before implementation). User supplies the key through secure connection settings, not chat. Validate image capability and qualify per-call costs before paid execution.

LinkedIn and Newsletter editors both offer Generate image, Upload image, brief-from-content or custom brief, preview, replace/regenerate, caption/alt text and explicit attachment/placement. A newsletter supports multiple section images rather than only a hero image. Each image request requires explicit authorization with an estimated reservation. Text generation does not silently purchase images; all media costs count under the configured package/monthly limits. A generation failure must not discard the written draft. Images and included/excluded export choices should be visible before approval.

Acceptance: the selected provider generates one authorized image for each channel, the user can position/include/exclude it, exports preserve the chosen layout and recorded media costs, and another generation requires an explicit request.

## 5. Editor finalization, user approval and timed publishing

This extends the earlier draft-only LinkedIn backlog. The user now explicitly requests scheduling by exact date/time/platform, editor finalization, agent preparation for publishing and user authorization of publication. This is a future controlled auto-publishing feature; current manual handoff remains unchanged until implemented, connected and approved.

Proposed flow:

1. Choose a supported social platform and exact account/Page/publication; set date, local time and timezone.
2. Editor modifies/finalizes the complete text/media package.
3. Agent runs configured checks and prepares a publishing package. Show status and actionable findings; retain the approved manual editorial override where applicable.
4. User approves the exact content version, media, destination and scheduled time. Make approval-before-scheduling versus a final publish-time approval choice explicit. The initial default should be explicit approval of that complete scheduled package, without requiring an extra surprise click at the scheduled instant.
5. At the chosen time, the worker publishes only if the approval, connected-account rights and package remain valid. Edits/destination/time changes after approval pause the pending release and require re-approval. Do not auto-publish an unreviewed revision.
6. Record actual platform post ID, URL, timestamp and result. Distinguish scheduled, awaiting approval, publishing, published, failed and outcome-uncertain. An API timeout is not proof of failure or publication; reconcile using supported provider status/identifiers rather than duplicating a post.

LinkedIn setup plan: create/configure a developer app, associate/verify the Page where required, configure OAuth redirects, request the actual required member/Page permissions and product access, connect the chosen account, verify roles/capabilities and manage token refresh/revocation securely. Member posting and company-Page posting need separate capability checks. Do not assume every active Studio channel has a supported or approved publishing API; build a capability matrix before promising cross-platform scheduling. Newsletter destination (LinkedIn Newsletter, an email platform or website) needs an explicit destination selection and its own integration capability.

Preserve the earlier request to prepare content without submitting it: verify whether an unpublished native LinkedIn draft is actually supported by the granted API. If not, offer an honest Studio draft/copy/open-LinkedIn handoff; never invoke publication as a workaround for creating a draft. Support both prepare-only and user-approved scheduled publishing where permitted.

Acceptance: select date/time/platform/account; edit; approve; verify one post at the intended instant, correct timezone/DST handling, paused approval after edits, revoked-token behavior, explicit cancellation/rescheduling and no duplicate post after a simulated ambiguous timeout. Imported historical approval labels never grant a new publishing authorization.

## 6. Ryan's Humanizer and writing instruction management (IB-07)

Obtain Ryan's Humanizer file or approved source link from the user; do not substitute a similarly named public prompt. Store it as versioned writing instruction/skill guidance, scoped to selected channels. It shapes language beneath factual/source rules and the active output template. Do not use it to fabricate experience or conceal uncertainty. New requests freeze the guidance actually used; existing requests retain their snapshots.

The upload belongs under an identifiable writing-guidance/skill section within Agent Rules, alongside but distinct from channel Instructions, Context/knowledge, voice examples, research rules and newsletter templates. Users can upload/download the original, preview/edit the extracted guidance, replace it and choose its LinkedIn/Newsletter scope. Preserve existing channel files; Humanizer is an additional layer, not a replacement for the other requested uploads. Record its version in newly generated requests and show whether it was included.

Ryan's file is an outstanding dependency; obtaining it is not marked done. The plan does not authorize fetching private files from Ryan or messaging him. The user can supply the file or an approved accessible source link.

Acceptance: save the actual supplied Humanizer; generate a test post/newsletter with matching scope and verify its saved model context includes that version; replacing the file changes only future requests. Inspect the writing for the intended style without weakening factual checks or inventing personal experience.

## Carry-forward usability and reliability requirements

The requested enhancements must retain the existing simple editor/review flow. Routine checks run in the backend with visible status, not a new manual checklist. Optional outline/template previews must not become extra compulsory approval gates. Existing reasoned editorial override remains available; the final publishing authorization is a real user decision about the exact content/destination/time. Keep editable drafts, sources, image-free downloads, costs/reservations and recovery evidence intact. These are acceptance constraints, not claims that future publishing or new paid providers have already been implemented.

## Other historical project backlogs

This document is the complete master for the **two recent improvement lists**, not a deletion or reclassification of every historical engineering item. Older implementation/status records remain in [backlog-status.json](backlog-status.json), [BACKLOG-EXECUTION.md](BACKLOG-EXECUTION.md), and the dated continuation records in [WORK-IN-PROGRESS.md](WORK-IN-PROGRESS.md). Their older deferred-provider/manual-only assumptions must be read together with later user changes; this plan does not mark those historical live-validation tasks as passed.

## Outstanding inputs before corresponding builds

- User approval of build order and each reviewable screen/flow before implementation.
- Ryan's Humanizer file or approved link; newsletter structure and visual-layout examples.
- Preferred image provider/model and explicit image/search spending limits.
- Target LinkedIn identity (personal profile, company Page or both) and newsletter publishing destination.
- Search provider evaluation/selection; exact approved primary-sector domains can be seeded from user suggestions and refined.
- Decisions on combined website/social import rows and whether a spreadsheet's historical published/approval metadata should be retained as labelled imported history.

Do not request API keys/tokens in chat. Keep private source files intact; implementation should not copy their full contents into public queries or repository documentation.
