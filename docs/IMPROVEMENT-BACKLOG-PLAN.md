# RyzaLab Content Studio — improvement backlog and proposed build plan

Status: planning only. Latest user request is to add requirements to the backlog, not implement features or import operational data. This plan supersedes older manual-only publishing/design assumptions only for future work after approval. No production writes, feature implementation, paid calls, LinkedIn connection or spreadsheet import are authorized by this planning task.

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

## 2. General web research, sector priority and Humanizer

Current code attempts web/news discovery alongside Wikipedia and Crossref; the user's observed results are not meeting the required breadth/relevance. The improvement must make general web search first-class and show provider coverage/failures instead of silently appearing Wikipedia-only.

Add Research Instructions and Source Preferences under Agent Rules, separately editable/uploadable/downloadable. Primary sectors: construction, real estate, home automation, IoT and adjacent building/smart-home disciplines. Support baby-care/elder-care contexts when relevant to the brief. Let the user configure preferred/excluded domains, time window, language, geography, source type and supplied URLs. Existing channel writing/knowledge/voice rules remain separate from research rules.

Search in two explicit passes:

1. Sector-first: official product/technical documentation, standards/regulatory bodies, research and credible specialist industry sites matching the brief and audience. Evaluate relevance before accepting excerpts.
2. Wider discovery: broaden to general news, other disciplines and background material only when sector coverage is insufficient or the user requests it. Keep relevance ranking; do not fill a source list with unrelated matches. Wikipedia is optional supplementary background, not a required/preferred starting point.

Choose/evaluate a general web/news search provider based on index coverage, available page retrieval, citation quality, per-request bounds and cost. Supplied URLs need a bounded safe public-page reader (including redirects/content limits and private-network protection). Accessible website text may be used with source attribution; private/paywalled/unavailable pages need an honest coverage message. Do not claim that a search index reaches every page on the internet. Uploaded private instructions never become public search queries.

Each result retains title, domain, URL, date when available, excerpt, relevance and retrieval time. The generation step distinguishes sourced claims, interpretation and missing evidence. Conflicting sources or sensitive baby/elder health claims require appropriate evidence rather than invented certainty. Show the actual sector/wider search coverage and fallback reason.

Obtain Ryan's Humanizer file or approved source link from the user; do not substitute a similarly named public prompt. Store it as versioned writing instruction/skill guidance, scoped to selected channels. It shapes language beneath factual/source rules and the active output template. Do not use it to fabricate experience or conceal uncertainty. New requests freeze the guidance actually used; existing requests retain their snapshots.

Acceptance: a construction/smart-home brief produces relevant specialist web sources without relying on Wikipedia; insufficient coverage visibly triggers wider search; a supplied public URL is traceable; inaccessible pages and missing facts are not fabricated; the Humanizer inclusion is visible in a new request's saved context.

## 3. Newsletter structure and multi-source creation

Add distinct upload/edit/download controls for (a) content structure and writing rules, and (b) visual/export layout. Initial formats: Markdown, DOCX and pasted text; PDF can be reference material with extraction limitations shown. The selected template defines section order, headings, introduction, recurring sections, summaries/CTA, source placement and optional image slots. The layout controls fonts, spacing, margins, headers/footers and image placement in PDF/DOCX. Provide a preview and store versioned snapshots of the template used.

Newsletter input is a collection, not one item. Users can combine:

- Multiple existing ideas, including old generated ideas.
- Existing posts/drafts or approved post snapshots (clearly distinguished).
- Imported pipeline briefs.
- Multiple pasted text items and uploaded PDF/DOCX source documents.

Show a source basket with item title, origin/version, selected excerpts and remove/reorder controls. Preserve originals; do not rewrite them as a side effect. Distinguish a published post's URL/version from an editable draft. Scanned PDFs may require OCR; missing extraction must be reported.

Before generation, propose an editable combined outline mapped into the selected template: shared theme, background, several distinct stories/sections, evidence, practical implications and conclusion. Merge repetitions, identify contradictions/gaps and retain provenance for each section. Do not simply concatenate several posts or fabricate links between unrelated topics. Allow the user to refine the theme/order or exclude an item.

Final output follows the chosen structure, contains the selected topics/ideas, cites actual supplied/retrieved sources and includes approved images in the designated slots. Keep length configurable with the current detailed-newsletter default; verify actual page layout in export rather than promising a fixed page count from word count alone. Allow text-only generation and downloads without images. Approved image generation can follow the written draft as a separate bounded action.

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

## Outstanding inputs before corresponding builds

- User approval of build order and each reviewable screen/flow before implementation.
- Ryan's Humanizer file or approved link; newsletter structure and visual-layout examples.
- Preferred image provider/model and explicit image/search spending limits.
- Target LinkedIn identity (personal profile, company Page or both) and newsletter publishing destination.
- Search provider evaluation/selection; exact approved primary-sector domains can be seeded from user suggestions and refined.
- Decisions on combined website/social import rows and whether a spreadsheet's historical published/approval metadata should be retained as labelled imported history.

Do not request API keys/tokens in chat. Keep private source files intact; implementation should not copy their full contents into public queries or repository documentation.
