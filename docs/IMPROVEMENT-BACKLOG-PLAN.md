# RyzaLab Content Studio — improvement backlog and proposed build plan

Current instruction: **the user has explicitly authorized implementation of the pending backlog.** Work proceeds in tested releases, starting with save/recovery reliability and the two-person review flow. Missing provider credentials/files and actual publishing approvals remain prerequisites for their respective capabilities.

Status update: the user approved building and deploying after reviewing the wireframes, then accepted the first-release scope: Calendar import/template and Existing Pipeline (Build 1). Build 1 is implemented and verified locally for v0.3.28; production rollout verification is pending. Remaining builds stay queued for subsequent releases; provider credentials, private guidance files and actual publishing approvals are still required where applicable. No operational calendar has been imported and no paid provider call has been made during development.

## Complete master backlog — both user request lists

This is the master plan for **all improvement items in the earlier seven-item list and the later four-item expansion**. Earlier requirements are retained, not replaced by the calendar spreadsheet request. The earlier list's item 8 was blank; no requirement has been invented for it. The ten entries below separate combined requirements so each can be tracked and reviewed. Build 1 (IB-03 and IB-04) is implemented and locally verified for v0.3.28; other items remain planned. Existing basic capabilities, such as PDF/DOCX export, are a baseline to improve rather than proof that the requested enhancement is finished.

| ID | Complete requested improvement | Origin | Proposed build | Status |
|---|---|---|---|---|
| IB-01 | Add an image-generation API key/connection for OpenAI (user-selected provider), retaining a future supported Google option. Provide image generation inside **both LinkedIn post, Blog and Newsletter creation**, including content-based/custom prompts, preview, attachment/placement, replacement and optional export inclusion. | Earlier #1; earlier newsletter image requirements | 4 | Planned |
| IB-02 | Upload, edit, download and select a **newsletter structure/format template**. Generate the final newsletter in that structure, with image slots and a matching visual PDF/DOCX layout. Preserve detailed background, evidence, reasoning, sources and the existing 1,200–1,600-word / at-least-2–3-page target, subject to the chosen template and actual export pagination. Text-only export remains available. | Earlier #2 and #6.1; expanded #4; previous newsletter requirements | 3, then image integration in 4 | Planned enhancement |
| IB-03 | Upload an existing **Excel content calendar** and provide a downloadable XLSX template based on the supplied workbook. Preview/map columns, import dates/times/platforms, retain history and detect duplicates. Import actual entries, not empty formatted spreadsheet rows. | Earlier #3; expanded #2 | 1 | Implemented v0.3.28; rollout verification pending |
| IB-04 | Create **Existing Pipeline** with its own header and searchable dropdown in **both Ideas and Create**, for **LinkedIn posts and Newsletters**. Imported titles and angles become linked pipeline briefs/calendar entries. Start in three ways: imported brief, AI or manual. From a pipeline brief, either generate ideas or **write content directly**. | Earlier #3.1; expanded #2 | 1 | Implemented v0.3.28; rollout verification pending |
| IB-05 | Replace the apparent Wikipedia-first experience with **general web/news search and supplied website/link retrieval**. Use relevant accessible websites and other sources; retain source URLs, dates, excerpts and coverage. Wikipedia must be completely excluded from new research discovery, retrieval and generation evidence. | Earlier #4; expanded #3 | 2 | Planned |
| IB-06 | Add separately uploadable/editable **Research Instructions and Source Preferences**. Search construction, real estate, home automation, IoT and related specialist sectors first; include baby-care/elder-care contexts where relevant; then broaden to other areas when needed. Make preferred/excluded websites, relevance and widening/fallback behavior visible. | Earlier #4, including sector examples; expanded #3 | 2 | Planned |
| IB-07 | Obtain **Ryan's Humanizer** and upload it as distinct writing instruction/skill guidance used for content generation. Keep it identifiable, editable, versioned and scoped to the intended channels. Do not replace it with an unrelated public prompt or bury it within research settings. | Earlier #5 | 2 | Planned; Ryan's file/link needed |
| IB-08 | Create **one multi-topic newsletter** from multiple existing/generated/old ideas, old posts or saved content, pipeline briefs, newly entered ideas, pasted text and **PDF/DOCX uploads**. Let users select/remove/reorder inputs, consolidate them coherently, preserve sources and apply IB-02's template and approved images. | Earlier #6; expanded #4 | 3, then image integration in 4 | Planned |
| IB-09 | Provide **LinkedIn API connection/setup guidance and OAuth**. Retain a **prepare-only mode**: put/prepare the final post without submitting it if the granted API supports native drafts; otherwise use an honest Studio draft/copy/open-LinkedIn handoff. Never publish merely to simulate saving a draft. | Earlier #7 | 5 | Planned; capability verification needed |
| IB-10 | Add **specific date/time/timezone and social platform/account scheduling**. Editor modifies/finalizes content; agent prepares the publishing package; **user approves publication of the exact package and schedule**; a supported publisher releases it at the approved time and records the actual result. Edits require reapproval; uncertain API outcomes must not produce duplicate posts. Prepare-only IB-09 remains a separate available mode. | Expanded #1; extends rather than deletes earlier #7 | 5 | Planned; provider/platform access needed |

## Feedback execution pipeline — authorized, delivered in tested releases

| ID | Item | Priority | Status |
|---|---|---|---|
| IB-11 | Consistent spacing between sections throughout Studio, including the Calendar import/pipeline layout shown in the user's screenshot. | High — usability | Authorized; queued |
| IB-13 | Clarify AI maximum allowance versus recorded usage cost, expose the calculation, and evaluate tighter estimates and confirmation within existing budgets. | High — cost clarity | Authorized; queued |
| IB-14 | Broaden and improve research across relevant websites, news, specialist blogs and accessible YouTube material; remove Wikipedia completely from new research. Refines IB-05/IB-06. | High — research quality | Authorized; queued |
| IB-15 | Evidence-led deep research: investigation briefs, primary-source tracing, full-source reading, claim verification, data analysis, research dossier, reliable writing handoff and bounded costs. Extends IB-14/IB-05/IB-06. | High — research depth and reliability | Authorized; queued |
| IB-16 | Add Blog as a 4–10 minute reading format alongside short LinkedIn posts and 8–15 minute newsletters, with an editor format dropdown and the same applicable research/writing features. | High — content creation | Authorized; queued |
| IB-17 | Shared imported/generated/manual idea and brief library available across every active channel and Blog format, with destination-specific adaptation rather than source-channel lock-in. | High — cross-channel creation | Authorized; queued |
| IB-18 | Reliable draft saving: preserve unsaved edits, reconcile timed-out saves, prevent duplicate submissions, synchronize versions and resolve conflicts safely; investigate database latency. | High — reliability / edit preservation | Authorized; queued |
| IB-19 | After confirmed Submit for review, close the editor and return to the Create list with a clear Under review status and View in Reviews action. | High — workflow clarity | Authorized; queued |
| IB-20 | AI resolves actionable review findings, rechecks the revised draft and escalates only facts/decisions it cannot resolve; founder reviews the final changes and gives final approval. | High — agentic review / minimal manual work | Authorized; queued |
| IB-21 | Reviews page with two sections: pending actionable reviews above approved/published history; latest 10 published items, 1/2/3/6/12-month filters, metadata and exact-version popup previews across channels. | High — review/history usability | Authorized; queued |

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

The Calendar screenshot supplied with the spacing report supports IB-11. No layout edits, feature code, import operations or deployment are authorized by this backlog entry.

### IB-13 — clearer AI allowances and recorded costs

User approved queuing the recommendations from the cost-display discussion. IB-12 was withdrawn and remains withdrawn; its identifier is not reused.

Scope when authorized, in priority order:

1. Replace “Confirm AI request allowance · $0.14” with **“Approve up to $0.14”**, using the actual quoted maximum rather than a hardcoded value.
2. Explain that this is a conservative maximum reservation, not the final charge. Final recorded cost depends on reported usage; unused reservation is released only after a supported, conclusive settlement. Unknown or unreconciled outcomes must retain truthful reservation/status wording rather than promise a release.
3. Show the completed request's **recorded cost and approved maximum together**, e.g. “Recorded cost: $0.07 · Approved maximum: $0.14”. Distinguish usage-priced cost, unresolved reservations and provider invoice charges.
4. Provide an expandable explanation of the input/context estimate, maximum output allowance, provider/model rates and whole-cent rounding. Explain why similar requests can share a maximum despite different actual usage. Use the frozen pricing snapshot for that request.
5. Subsequently evaluate tighter estimates against representative requests and actual usage. Do not weaken spending limits or present an expected cost as a guaranteed ceiling.
6. Evaluate proceeding without repeated confirmation only where a request is covered by an existing explicit authorization for that actor, content, function and budget. Require confirmation when outside that authorization; retain request/package/monthly limits, uncertain-request protection and explicit authorization for additional paid attempts. Do not enable new spending by default as a cosmetic change.

Acceptance when built: maximum allowance and recorded usage are visibly distinct before/after a request; the breakdown matches saved pricing/usage; failed/unknown requests do not imply zero cost or automatic release; an authorized-budget flow avoids redundant confirmation without bypassing limits. Prioritize wording and final-cost visibility before estimate/confirmation behavior changes.

Status: queued only. No app changes, pricing adjustments, paid calls or deployment until the user explicitly instructs building.

### IB-14 — diverse, relevant research; no Wikipedia

Latest user instruction: explain the proposed changes and queue them; do not build. This strengthens IB-05/IB-06 rather than replacing the existing sector-first/research-rules requirements.

Observed issue and read-only diagnosis:

- The screenshot contains mostly Apple home/store/account pages, a relevant news article and a Wikipedia company introduction. Home/store/account snippets are not evidence about the specific home-device event or claim.
- Current discovery attempts Bing web/news RSS with up to three results per search, merges them with Wikipedia/Crossref and caps the combined result set at six. It does not fetch those discovered article pages.
- The current lexical screen can accept a generic page merely because it mentions a topic word such as Apple. There is no sufficient source-domain diversity or topic-specific article-quality selection. The screenshot alone does not establish a provider outage.

Proposed changes when authorized:

1. **Remove Wikipedia completely from new research:** disable its dedicated retrieval, exclude Wikipedia domains/subdomains in discovery and after redirects, and block Wikipedia evidence in new idea/post/newsletter requests, including previously saved Wikipedia references selected for a new run. Do not silently delete historical jobs, costs, drafts or citation records; label those historical sources as excluded from future research. Do not substitute a Wikipedia mirror as independent evidence.
2. **Use broader discovery:** evaluate a supported general web/news search provider and bounded safe retrieval of accessible article pages, official technical documentation, standards/regulatory sources, specialist publications, credible independent blogs and YouTube material. Do not claim to search every page on the internet or bypass private/paywalled content.
3. **Search the subject, not just the brand:** make several bounded targeted searches for the actual event/product/claim, audience and relevant sector. Prioritize construction, real estate, home automation and IoT (and relevant baby/elder-care contexts), then broaden when coverage is insufficient. A vendor homepage, store, login/account page, category index or search page should not qualify merely for mentioning the company.
4. **Select for relevance and diversity:** deduplicate syndicated/repeated stories; prevent one domain from dominating when relevant alternatives exist. Prefer multiple independent publishers plus relevant primary sources. For a normal topic, aim for 4–6 useful sources across at least three domains when available; never fill a quota with irrelevant material or fabricate coverage. Relevant Apple support/product documentation can remain; generic Apple pages should be excluded.
5. **Handle blogs and YouTube honestly:** identify author/publisher, publication date and source type. Distinguish official statements, independent reporting, opinion, affiliate/sponsored content and peer-reviewed material. Use video transcripts/captions or creator descriptions only when accessible through supported methods; preserve video/channel URL and timestamps where available. A title/thumbnail/snippet is not proof the video was watched. If no transcript is available, show the limitation or let the user supply one.
6. **Show usable evidence:** display article/video title, publisher/domain or channel, date when available, original link, excerpt/transcript passage, why it matches the brief and what was actually retrieved. Distinguish search snippets from fetched page text/transcripts and identify unavailable material. Search snippets alone must not be presented as full-article verification.
7. **Apply consistently:** research for AI ideas, manually entered ideas, post writing and newsletter generation follows the same exclusion/relevance rules. Preserve traceable selected sources per request; newsletters cite actual sources in their body/export while LinkedIn posts retain a separate research/source panel unless the user asks for inline citations.
8. **Keep research configurable and bounded:** expose preferred/excluded websites and source types under the planned Research Instructions/Source Preferences; Wikipedia exclusion is mandatory, not a user-toggle default. Show sector-first/wider-search coverage and missing evidence. Paid search/tool costs, retrieval bounds, privacy protection and authorization remain explicit; no private Agent Rules/context are sent as public search queries.

Acceptance when built:

- No Wikipedia endpoint or domain is contacted or returned/attached to a new request, including fallback, redirect and saved-evidence paths. Historical records remain intact and clearly identified.
- The screenshot's topic returns relevant event/device reporting and specialist evidence instead of generic brand/store/account pages; diverse sources appear where available.
- A relevant blog and accessible YouTube transcript/description can be selected and attributed honestly, with missing access reported.
- Coverage, dates, links, evidence excerpts and source types remain visible and traceable in ideas and writing; insufficient results trigger a coverage message, not unrelated filler.
- Ranking/diversity and sector fallback are demonstrated on representative briefs; no live paid test is started without its authorized budget.

Status: queued only. No research code, source configuration, saved evidence, paid request or deployment changed by this planning task.

### IB-15 — comprehensive deep-research programme

Full plan: [DEEP-RESEARCH-BACKLOG-PLAN.md](DEEP-RESEARCH-BACKLOG-PLAN.md).

Expand source discovery into a senior-writer-style investigation: adaptive depth, explicit subquestions, sector-first and contrary-evidence searches, original-source tracing, full article/PDF/accessible transcript reading, source independence/quality, claim-to-passage checks, reproducible data analysis, contextual insights and a reusable dossier. Preserve a simple user flow, exact source/rule snapshots, meaningful progress and independent research/generation recovery under explicit spending limits. Exclude Wikipedia completely. Never invent interviews, facts, citations, metrics or source access. No external outreach without separate authorization.

The detailed plan includes phases, a proposed 30-brief evaluation set, engineering/editorial acceptance criteria, cost/freshness rules and provider/input dependencies. It complements IB-14 rather than silently marking the underlying research changes complete. Current lease-expiry recovery must be verified before adding deeper paid automation.

Status: backlog/design only. No implementation, paid research, provider setup, outreach, operational imports or deployment authorized by this planning task.

### IB-16 — Blogs and a shared writing-format selector

User request: add Blogs between short LinkedIn posts and longer newsletters. All applicable existing/planned features should remain available, and generated ideas must be usable to write blogs as well as posts/newsletters.

Format targets:

| Writing format | Requested length | Writing behavior |
|---|---|---|
| LinkedIn post | Short-form | Concise, focused post using channel-appropriate length, structure and attribution. |
| Blog | Estimated 4–10 minute read | A developed article with an introduction, useful headings, evidence, analysis and conclusion; depth appropriate to its subject. |
| Newsletter | Estimated 8–15 minute read | A deeper, structured edition with background, analysis, sources and support for combining topics/material. |

Reading time is an estimate, not a guaranteed duration. When built, use a documented consistent reading-speed assumption to calculate a visible reading-time estimate and word count; let users set a target within the selected range. These ranges overlap intentionally. Do not distinguish formats by length alone: structure and purpose also matter. The new newsletter reading-time requirement supersedes a fixed 1,200–1,600-word default where that default cannot meet the chosen target. Existing page-count/export requirements remain layout-dependent and must not be falsely guaranteed from words alone.

Scope when authorized:

1. Add **Blog** as an explicit first-class writing format in Ideas and Create, alongside LinkedIn post and Newsletter. Do not restore any retired channel. Keep content format separate from destination/platform; choosing Blog does not imply a supported native LinkedIn publishing API or a connected website/CMS.
2. Add a clearly labelled **Write as** dropdown in the LinkedIn writing flow/editor: **LinkedIn post / Blog / Newsletter**. Make the choice available when opening writing from a generated idea, a manually created idea or Existing Pipeline, and retain it in the saved draft and generation request.
3. Let users create a Blog directly from generated ideas, with the selected idea, research evidence, source links, pipeline origin and applicable Agent Rules carried into the writing request. Retain the same manual and imported-brief entry paths.
4. Give Blogs the same applicable capabilities: saved Instructions/Context/knowledge/skills, original voice and Humanizer, deep research and traceable sources, editable structure/templates, optional images and placement, writing progress, revisions, review/override, budgets, calendar planning and supported text/PDF/DOCX exports. Planned capabilities remain planned dependencies, not claims that they exist now. Source citations should be readable in long-form Blog output and preserved in exports.
5. Use format-specific generation contracts, structure and qualified output allowances. A Blog must not be a short post relabelled as a Blog, and a Newsletter must meet its own reading-depth/structure target rather than sharing an identical length prompt. Handle insufficient evidence honestly rather than padding to a target.
6. Changing Write as on an existing draft must preserve the original and its history. Show that a format change does not automatically rewrite or overwrite the text. Rewriting/adapting requires an explicit action under the existing valid budget or a new approved allowance; changed content/format must refresh review/approval as applicable. Do not silently change publishing destination or lose selected sources.
7. Display format and estimated reading time in the editor, preview, relevant idea/draft actions and library/calendar details, without appending metadata to the saved title. Publishing remains subject to the exact destination's actual capability and a final approved package.

Acceptance when built:

- An AI-generated idea, manual idea and imported brief can each open a Blog draft, preserving evidence and provenance.
- The LinkedIn writing flow offers all three Write as choices and preserves the selected format after save/reload.
- New generation uses the selected format's structure and target; word count/estimated reading time accurately reflect the resulting text.
- Existing text/history, sources and destinations survive format selection; no paid rewrite or publication starts merely by changing the dropdown.
- Applicable rules, research, images, exports, review and budget controls operate for Blogs consistently with the other formats. Blog/newsletter layout and citations survive image-free export as well.

Dependencies: newsletter structure/exports (IB-02), pipeline/idea entry points (IB-04), research/Humanizer (IB-05/06/07/14/15), images (IB-01), combined long-form content where applicable (IB-08), destination/scheduling capabilities (IB-09/10). Extend relevant planned screens and acceptance tests when explicitly authorized; do not start implementation now.

Status: queued only. No app code, generation limits, stored content, channel setup or deployment changed.

### IB-17 — shared pipeline and ideas across channels

User report: selecting Newsletter in Create shows No matching briefs after importing LinkedIn calendar entries. User requires imported and generated ideas to be available for LinkedIn, Newsletter, Blog, Instagram, Reddit and YouTube. Manual ideas should follow the same shared-library behavior.

Current cause confirmed read-only: Existing Pipeline filters briefs by `brief.channel === selected channel`. Its Create for options are limited to the source channel, LinkedIn and Newsletter; when no brief matches, the first LinkedIn option can display even under the Newsletter tab. The standard idea.use flow creates content in the idea's original channel and searches for an existing draft by idea/author without a distinct target channel/format. Removing only the dropdown filter would therefore be incomplete.

Scope when authorized:

1. Treat imported briefs and AI/manual ideas as reusable source concepts. Make the authorized shared collection available from Ideas and Create for every active destination: LinkedIn, Instagram, Reddit, YouTube and Newsletter, plus Blog as the IB-16 writing format. Do not restore retired channels or imply a Blog is already a connected publishing platform.
2. Preserve the imported/generated source channel, original planned date, audience, angle, source links, versions and provenance as metadata, not as a restriction on reuse. Channel tabs can filter channel-specific output drafts; they must not hide reusable source briefs from the creation picker. Offer source-channel filters explicitly if useful, without making them the default lock-in.
3. Let users choose the target platform/account and writing format independently. Default the target to the selected channel, show the full supported choices, and prevent the screenshot's misleading LinkedIn default under Newsletter. Blog follows the shared Write as format selector and an explicit destination when publishing is needed.
4. From the same brief or generated/manual idea, allow Generate ideas, Add manually or Write directly for the selected target. Adapt the output's audience, length, tone and structure using that destination's rules; do not simply copy an identical LinkedIn post into every channel. Example outputs include an Instagram caption/carousel outline, Reddit discussion, YouTube script, Blog or Newsletter where appropriate.
5. Create independently editable derivatives linked to the common original. Reuse the exact existing derivative when intended, but key that lookup by source + author + target channel/account + format, rather than returning an unrelated existing LinkedIn draft when the user requested a different output. Do not duplicate shared source records simply to populate each channel's dropdown.
6. Carry selected evidence into derivatives with source access, relevance, freshness and Wikipedia-exclusion checks. Use the target channel's saved Instructions/Context/voice/Humanizer and output contract. Original channel approval never approves another channel's adapted content.
7. Keep original imported calendar dates intact. A new destination's date/time/account, budget, review and publication approval are separate decisions. Cross-channel availability never auto-generates paid content, schedules multiple releases or publishes everywhere.
8. Preserve existing drafts, source permissions, IDs and history during rollout. Shared means available to authorized users, not bypassing channel/private-source access grants.

Acceptance when built:

- Import a LinkedIn-only workbook and verify its briefs can be selected under Newsletter, Instagram, Reddit, YouTube and LinkedIn, and used for a Blog when IB-16 is implemented.
- Repeat with an AI-generated idea and a manually entered idea. Selecting an output target does not alter or duplicate the original source concept.
- Create a LinkedIn post and a Newsletter/Blog/video derivative from the same source; verify separate correctly formatted drafts, rules, budgets and approvals, with preserved common source evidence.
- The target picker matches the active creation destination, includes all supported targets and no longer shows an unrelated LinkedIn default when Newsletter has no channel-labelled source records.
- No source edit, date reassignment, paid request, multi-channel scheduling or publication happens simply by changing tabs or selecting a target. Permission-restricted sources remain restricted.

Status: queued only, subject to the standing no-build instruction. Extends IB-04, IB-08 and IB-16. No app changes or deployment.

### IB-18 — draft save reliability, timeout recovery and version conflicts

User approved backlog capture of the save-reliability recommendations, not implementation. Focus on the actual reported messages: “The Studio database save timed out” and “This draft changed. Reload before saving so no edits are lost.” A successful database commit with a lost/timed-out response could leave the editor stale and cause the second error, but that connection is a hypothesis until request traces confirm it. Do not diagnose a missing migration from a timeout.

Scope when authorized:

1. **Preserve unsaved edits first.** Maintain a recoverable local working copy while saves are pending, timed out or conflicted. Show Unsaved, Saving, Saved, Save outcome unknown and Conflict states truthfully. Scope recovery to the correct account/workspace/draft; address local storage access, retention, sign-out/shared-device behavior and failed local writes. Do not claim edits are safely backed up unless that write succeeded.
2. **Reconcile uncertain saves.** Give the save an identifiable operation and check whether that exact operation committed after a response timeout. If confirmed, synchronize the persisted revision/baseline without replacing newer local edits. If still uncertain, retain the local copy and show a status-check action. Never interpret a timeout as proof of failure or blindly resubmit an AI request.
3. **Make retries idempotent.** Stable operation IDs bind to the actor, workspace, target, expected version and exact payload. Same-operation retries cannot duplicate drafts, saves, reservations, AI jobs or charges; changed payloads require a distinct operation. Preserve existing concurrency checks and budget protections.
4. **Handle conflicts without destructive reloads.** Show the user's unsaved version against the latest saved version, identify meaningful differences and support a deliberate merge or saving a separate copy where authorized. Keep originals/history. Do not silently choose last-write-wins, overwrite newer work or discard a local recovery copy merely because a refresh succeeded.
5. **Keep editor versions synchronized.** Coordinate acknowledgements, background refresh, other tabs/sessions and AI/worker updates. A delayed response must not move the editor backward or replace newer local text. Edits after a save starts must remain dirty; update the baseline only to the version actually acknowledged. Review/approval still applies to the exact resulting revision.
6. **Measure and fix the underlying latency.** Trace the reported operation through database read/commit times, workspace payload size, concurrent saves, worker updates and transaction contention. Choose optimizations from evidence; do not assume the cause or merely extend timeouts. Consider bounded writes or storage changes only if measurements justify them, with migration/compatibility planning where needed.
7. **Use actionable, accurate messages.** Distinguish slow save, confirmed save failure, uncertain outcome and revision conflict. Keep a diagnostic reference for investigation, but show a practical recovery action. A database save timeout, provider outcome uncertainty and missing schema are different states and must not be conflated.

Acceptance when built:

- Simulate both commit-success/response-loss and no-commit/timeouts; recover the correct outcome with preserved user edits and no duplicate operation.
- Test editing while saving, delayed/out-of-order responses, refresh/reopen, two tabs/users and AI updates during editing. No newer local/server content is silently lost.
- Verify conflict comparison/merge/separate-copy recovery, stale-version rejection, permissions, retained history and approval invalidation after relevant changes.
- Confirm same-operation retry behavior and no duplicate job/reservation/charge. Unknown provider outcomes retain existing protection and are not automatically retried as a save-recovery shortcut.
- Verify local recovery isolation/retention, sign-out handling and an honest fallback when local persistence fails.
- Record measured database timings and before/after evidence for any performance optimization; production diagnosis is separate from fixture tests.

Proposed priority when authorized: **preserve edits → reconcile timed-out saves → synchronize versions and resolve conflicts → optimize measured database bottlenecks**. Coordinate with IB-15's research/generation worker-recovery prerequisite without treating this draft-save item as proof that provider lease expiry is fixed.

Status: queued only. No app code, local recovery storage, database settings, retries, migrations, paid requests or deployment changed by this planning task.

### IB-19 — clear completion after review submission

User report: after Submit for review, the editor stays open with the same submission button, making it unclear whether the action completed. Requested behavior: close the editor and show the Create list so the user understands the content is now under review.

Current cause confirmed read-only: the editor button calls content.submit through run and sets a success notice, but does not call the existing back/navigation callback after success. The automatic-review status can change while the user remains in the editor. The screenshot alone is not proof that every displayed draft has a confirmed successful submission; use server state to decide navigation.

Scope when authorized:

- Show Submitting… and prevent repeat clicks while the action is pending.
- After confirmed successful submission, close the editor and return to the Create list. Preserve useful channel filters/list position, but ensure the submitted item is visible rather than hidden by a stale search/filter.
- Show a clear confirmation such as “Submitted for review — now under review”, plus View in Reviews. Mark the list item Under review; show automated-check progress separately if checks continue in the backend. Submission completion does not mean review or publication is complete.
- Avoid leaving an active Submit for review action that invites accidental duplicate submissions for the same submitted revision.
- On validation error, failed save or uncertain/timeout outcome, stay in the editor, preserve writing and show recovery/status actions. Reconcile the original operation through IB-18; navigate only when submission is confirmed, never falsely report success or retry a paid review request.
- Apply consistently to posts, newsletters and Blogs when available. Editing/resubmitting a later revision must follow existing revision and approval protections.

Acceptance when built: successful submit returns to Create with the exact item marked Under review and a working Reviews link; pending prevents repeat submissions; failure/uncertainty preserves the editor and edits; refresh retains the authoritative submission state; backend review may continue without another manual step or duplicate job.

Status: queued only under the standing no-build instruction. No submission handler, navigation, content state, review request or deployment changed.

### IB-20 — automatic correction and re-review with minimal founder actions

User request: when AI review produces action items, AI should solve the problems itself so founder intervention is minimal. Keep the user-facing workflow simple; do not expose a mandatory manual checklist for each finding.

Screenshot distinction: the supplied screen says no AI reviewer result is claimed and the previous review outcome is uncertain. Those operational blockers are not completed AI content findings. Recover/reconcile that existing request before claiming review success or starting an additional paid attempt. The new correction loop must not pretend to fix an unknown review outcome through content edits.

Scope when authorized:

1. **Review → correct → re-review in the backend.** From a successful current-version report, classify issues, produce a revised candidate, run the applicable checks again and attach a fresh report to that exact revision. Automate eligible iterations within a previously explicit authorized revision-loop allowance; do not introduce mandatory founder approval for each routine correction.
2. **Resolve issues the agent can address.** Fix clarity, grammar, repetition, length, headings, channel/template compliance, citation formatting and inconsistent wording. For factual/source issues, inspect relevant evidence, retrieve stronger sources when authorized, reconcile dates/versions, correct supported mistakes or narrow/remove unsupported assertions while preserving the user's intent. Mandatory Wikipedia exclusion and source-quality rules apply to new evidence. Do not invent replacement statistics, citations, quotes, experience, clients, events or interviews.
3. **Ask only for genuine founder inputs.** Escalate missing personal experiences, private company facts, unpublished commercial commitments, permissions/rights or material editorial decisions the agent cannot establish. Consolidate remaining questions into one concise panel, with proposed alternatives when possible. Never silently change an offer, position or central meaning merely to pass a check.
4. **Keep verification honest.** Distinguish automatically corrected, rechecked, still disputed/unsupported, user input required and operationally blocked. A draft rewrite, another model agreeing or a manual override is not factual verification. Reviewer identity/model independence and actual evidence access remain truthful. If independent review is configured, preserve that policy rather than replacing it with writer self-approval.
5. **Use bounded execution.** Set an explicit total package allowance and maximum iterations/time; propose an initial two correction cycles for evaluation, not an unlimited loop. Stop early when findings are resolved or when a cycle makes no meaningful improvement. If limits are reached, retain the best saved candidate, current findings and costs; show one clear continue/decision action requiring valid additional authorization where needed.
6. **Preserve originals and concurrent work.** Save revision history, before/after text and an issue-to-change mapping. Freeze source/rule versions used. Do not overwrite founder edits that occurred during a correction run; rebase safely or present a conflict under IB-18. Relevant edits invalidate earlier approval, and reports apply only to their exact content/media revision.
7. **Make status concise.** Show AI reviewing → fixing findings → checking revised draft → ready for founder approval, or a specific needs-input/failed/uncertain state. Provide an expandable summary of fixes, outstanding questions, sources and spending. Return-to-list behavior follows IB-19; users can inspect progress without managing individual backend stages.
8. **Retain one real final decision.** Present the revised complete package and a concise change summary for founder approval/publication, subject to actual destination capability. Do not automatically publish, manufacture a human approval or label unchecked media as inspected. Existing reasoned manual editorial override remains available and preserves unresolved evidence/cost statuses.
9. **Handle interruptions independently from editorial findings.** Use durable checkpoints and saved provider outcomes. Recover existing review/correction results first; do not blindly retry ambiguous paid calls or remove their reservations. Completed research, reports, candidates and founder answers survive interruption. Repeated submission must not launch duplicate loops.

Acceptance when built:

- A draft with fixable writing/citation/format issues completes review, correction and re-review without founder action at each stage, producing an inspectable revised candidate and current report.
- A factual correction is supported by actual permitted evidence; unsupported claims are qualified, removed or escalated rather than fabricated.
- Genuine missing founder information appears as a consolidated request; supplied answers resume the appropriate checks without repeating completed work unnecessarily.
- Original text, issue history, sources and before/after changes remain available; concurrent founder edits are preserved; a stale report cannot approve a newer version.
- Iteration/time/package limits, no-progress termination, permissions, independent-review policy and unknown-outcome protections hold. No unapproved extra paid request or publication occurs.
- The screenshot's uncertain-review scenario shows recovery status and never falsely claims that AI reviewed/fixed the draft.

Dependencies: current worker/review recovery prerequisite (IB-15), edit/timeout integrity (IB-18), clear submitted/review progress (IB-19), qualified cost authorization (IB-13), research/evidence quality (IB-05/06/14/15), channel formats/rules/templates (IB-02/07/16/17). Status: queued only. No review execution, correction request, content changes or deployment authorized by this backlog capture.

### IB-21 — two-section Reviews page and accessible publication history

User requests a Reviews layout with two distinct sections, recent published content and selectable historical ranges. Standing backlog-only instruction still applies.

**Section 1 — Pending actionable reviews (top)**

- Show items requiring writer/founder action, with content title, channel, format, submission date and a clear current status. Prioritize ready-for-founder work and genuine outstanding decisions in the two-person flow.
- Use a clear Open review action, opening the relevant review popup. Keep AI preparing/system-recovery status distinct from editorial action items; routine automated checks should not become a checklist for the founder.
- Display an item count and a meaningful empty state. Approved/published history must not inflate the actionable-review count.

**Section 2 — Approved & Published content (below)**

- Default to the **latest 10 confirmed published items**, newest publication first, across every active accessible social platform. Include Newsletter and Blog formats when available; publication destination capability remains explicit. There is no need for a separate history panel for each channel.
- Within this second section, provide Published and Approved / awaiting publication choices (or equivalent status filters). Approved but unpublished packages remain accessible without claiming they were published. The latest-10 default refers to actual published items, not the latest ten approvals.
- Each row/card shows **date, content heading/title, social channel/destination, content type and a Preview button**. Distinguish published date from approval date; optionally expose created date for users looking up writing history. Use the workspace timezone consistently and label the relevant date field.
- Preview opens in a **popup window/modal** with readable complete text and included images/media. Display the selected version, title, channel, type and appropriate approval/publication dates; provide the actual live URL when recorded. Show the immutable approved/published package for that record, not the latest editable draft. Opening/closing preview must retain list filters and scroll position.
- Provide historical period choices of **1 month, 2 months, 3 months, 6 months and 12 months**, plus a return to Latest 10. Once a period is chosen, show all matching authorized items through pagination/load more rather than silently limiting the period to ten. Keep newest first and show a result count/empty state.
- Make date-range semantics explicit: published-history ranges use the recorded publication timestamp; approved-but-unpublished history uses approval timestamp. If users choose to search by writing/created date, expose that basis explicitly rather than silently mixing different dates. Calculate calendar-month lookbacks in the workspace timezone and test boundary cases.
- Support channel/content-type filters within the common history where helpful, retaining an all-channels default and consistent metadata/Preview action under every date filter.

Data/integrity constraints:

- A scheduled time, submission, approval, export or copied text is not proof of publication. Show Published only from an actual platform result or the existing human-confirmed publication record; unknown outcomes remain unknown.
- Preserve original records, revision history, permissions and current publication links. Multiple platform publications of a shared idea must retain the correct destination/package/date rather than merge distinct posts incorrectly. Avoid duplicate rows caused by joins/repeated schedules.
- Do not auto-publish, alter approvals or load inaccessible private content as a side effect of opening history/preview. Older approved packages remain available where authorized even if their draft changed later.
- Apply the shared section spacing/responsive accessibility requirements. Modal supports keyboard focus, accessible close and mobile readability.

Acceptance when built: two clearly spaced sections; actionable count excludes historical items; default shows at most ten actual publications latest first; every requested month range retrieves the full matching history with correct dates/metadata; published and approval-only statuses remain truthful; all active accessible channels/formats are represented; every Preview opens the correct complete saved version and returns to the same list context.

Dependencies: IB-11 spacing, IB-19 submission completion, IB-20 two-person AI-preparation flow, IB-16 Blog formats and IB-09/10 future publisher receipts. Existing manual publication records should work without waiting for automatic publishing. Status: queued only; no page/layout code, record changes or deployment.

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
2. Wider discovery: broaden to general news, other disciplines and background material only when sector coverage is insufficient or the user requests it. Keep relevance ranking; do not fill a source list with unrelated matches. Wikipedia must be completely excluded, including fallback results and any newly selected generation evidence. This supersedes the earlier optional-background proposal.

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
