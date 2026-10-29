# RyzaLab solo-founder redesign — discussion proposal

October 29, 2026. DESIGN ONLY. This folder contains standalone wireframes and a proposal. It does not change the application, credentials, database, provider execution or publication behavior. Sample statuses, output and cost figures are illustrative.

## Decisions confirmed in this discussion

- Text/research provider choices: Anthropic (Claude), OpenAI and Google (Gemini).
- Two human content reviews: approve copy, then approve the complete package. Agents prepare and check work between these decisions.
- Manual external publication continues. There is no new social-account access or automated posting authorization.
- Current media integrations remain pending; showing an image/video/audio setup card does not qualify that service.

## Recommended everyday journey

1. Choose an idea in list or tile view. Use idea & create draft creates/opens its linked draft with idea, references, channel, format and instructions attached.
2. With a configured provider and preauthorized spending policy, the text agent drafts directly in Create. Without either, the draft still exists and can be edited manually. Progress and failures appear there. No queue-management visit or copy/paste of a provider response.
3. Human review 1: read/edit copy and accept it, request targeted changes or hold. Agents present evidence and actual findings rather than asking the founder to fill six forms. An idea selection is a direction choice, separate from these two content reviews.
4. Only after copy acceptance, prepare required assets and run final checks. Text-only items skip media work. Altering a sentence does not automatically regenerate unchanged assets.
5. Human review 2: inspect exact copy, images/slides/video, caption and agent report together. Approve the whole package or ask for specific changes. If changed copy affects visual wording or narration, identify those dependencies and invalidate only affected checks/assets.
6. Approval prepares package handoff automatically and adds it to Calendar's Ready to schedule tray. Date/time/platform/account chooser opens immediately. Founder can save a plan or schedule later; no invented date.
7. Calendar shows planned time/channel/account/status and an approved read-only preview. Editing opens the draft. A changed draft never silently replaces the scheduled approved snapshot.
8. A person publishes on the external service. Only after that, record its URL and publication time as human confirmed. Planned is not Published, and a human-confirmed URL is not platform verification.

## What changes in each requested area

| User request | Proposed behavior | Wireframe |
|---|---|---|
| Fewer manual review stages | Agent check report + copy approval + final-package approval | Create, Final review |
| Function-specific AI setup | Functions prelisted; reuse a saved credential or use a separate key; provider + account model dropdowns | AI setup + connection dialog |
| Idea flows into creation | One Use idea action links and opens draft; automatic drafting only within authorized configuration/budget | Ideas dialog → Create |
| Compact queue/history | Progress in draft; Activity is advanced. Latest ten completed records, all active/uncertain work accessible; older records paginated in a popup | Activity + history dialog |
| Remove Queue request jargon | Draft / Generate / Revise / Create assets actions; automatic background scheduling | Create |
| Top channel tabs + selection | Horizontal channel navigation and clearly selected sidebar, subtab and view toggle | Channel setup and other screens |
| No repeated workflow setup | Channel setup applied automatically; only revisit when instructions, brand or routing change | Channel setup |
| Handoff to calendar | Approval produces handoff, Ready to schedule entry and immediate planning popup | Final review → planner |
| Calendar as publishing overview | Channel/account/time/status + exact read-only text and media preview + edit link | Calendar + preview dialog |
| Compact ideas and layouts | List / tiles, title/channel/status/created/actual publication summary; full brief only in popup | Ideas + idea dialog |

## Queue: keep the mechanism, remove the chore

The background queue retains jobs across page closure, handles slow provider/render work, reserves money before dispatch and protects against duplicate calls after timeouts. Replacing it with a blocking browser request would recreate reliability and duplicate-charge risks. Founder actions should start the required work directly; the system manages the queue.

Show actual status: Preparing, Waiting for provider, Ready, Needs input, Failed or Outcome uncertain. Do not show fabricated completion percentages. Incomplete output is Needs attention, never a ready post. Retry/continue after an uncertain provider outcome requires reconciliation; no automatic paid re-run. Older history is a view over preserved records, not destructive storage archival or a new obligation to manage an archive folder.

## Quality without six manual forms

Agents prepare intake metadata, factual claim/source mapping, format checks, placeholder detection, brand checks, visual/caption checks and a final version/dependency comparison. Deterministic checks remain useful alongside model reviews. Reports distinguish Verified by rule, Agent recommendation, Needs human evidence, Not applicable and Not run.

- Automated flags are not release authorization. Copy approval and final-package approval remain explicit human actions.
- A green check cannot mean that a source was opened if it was not, that a model is independent if it is not, or that media was inspected if it was unavailable.
- Independent review uses a separately qualified reviewer where founder policy requires it. A single writing model doing a second pass must not be presented as independent review.
- Unknown or unavailable required checks hold the package. Stylistic recommendations can be overridden with a reason; the existing non-overridable misinformation/misrepresentation controls remain.
- The current policy's required human attestations cannot silently be replaced by agent decisions. Implementation needs a founder-approved policy mapping from the old nine stages to machine report + copy acceptance + exact-package human approval. Keep role/actor provenance and historical approvals.
- Notes retain explicit founder release authorization. It can live in the final review screen, with wording such as Approve package & authorize Note release. Record authorization separately against exact source and asset versions, even if the user performs one final action. Ordinary post approval must not grant Note release authority.
- The two reviews are distinct: copy acceptance does not approve unfinished media; final approval covers exact versions of everything being released. For text-only pieces, final review is a compact final check and scheduling action; optionally combining them is a future founder preference, not the selected default.

## AI setup and model selection

Prelist Ideas, Writing, Research, Independent review, Images, Video and Audio. Give each its own Edit control, connection state and budget allowance. Allow Use writing connection so the founder does not paste one key repeatedly; credentials are shared by a protected server reference. Changing a default cannot silently change approved snapshots or in-flight jobs. Keep per-function overrides.

Provider is a dropdown; Model is a second dropdown populated from that provider account. Validate access, supported function and pricing separately; listing a model does not prove it can research, create images or render video. Do not put Claude in an image/video generator dropdown as though text completion produces those assets. The model list must include pagination/cache expiry and useful credential/access errors; keep manual model ID as an advanced validated fallback.

Requests can run automatically only under a founder-configured spending authorization. The existing $5/month, $0.50/request pilot and $0 confirmation threshold are not automatically changed by this proposal. Offer a one-time settings decision about when to confirm spending. Stay within hard caps and conservative reservations including tools and retries. Unknown pricing or missing providers stops automation with an actionable message, not another empty dropdown.

## Provider research status

Attempted retrieval of official provider model-list references on October 29, 2026:
- https://platform.claude.com/docs/en/api/models/list
- https://platform.openai.com/docs/api-reference/models/list
- https://ai.google.dev/api/models

All three requests were blocked by this environment's network tunnel (403). No current model catalogue, price or new capability claim has been independently verified here. These are research pointers, not retrieved citations. Existing repository code already has model-access listing/validation for these three text providers; that is implementation evidence, not current provider documentation.

The user may provide current model lists/docs or screenshots containing names/capabilities/pricing, without keys. Before implementation, qualify account-level model discovery and capability/cost handling using official documentation and account access. Wireframes intentionally do not invent a current model catalogue. Images/audio/video service selection remains a separate evaluation.

## Weaknesses to resolve before implementation

1. More automation can make mistakes scale faster. Start with one selected idea and one channel; do not fan out or batch spend by default.
2. A partial or invalid provider result must be retained but not injected as final copy. Use structured outputs where supported, completion checks and an explicit recover/continue path with cost visibility.
3. Generated text should enter a retained candidate revision, preserving manual edits. Apply automatically only to an unchanged draft target; otherwise show a diff/merge choice.
4. Version copy, media, narration and captions separately. A copy edit rechecks affected claims and dependent assets; do not bill for regenerating every asset.
5. Calendar planning references an immutable approved package. Human edits need new approval and explicit replacement of a scheduled package.
6. Google Docs remains an editing surface, not another planning truth. Preserve conflicting edits and exact approved content as in current design.
7. Hiding old activity records is a usability improvement, not a fix for the current canonical-state size limit. Existing storage archival work remains separate.
8. A blank AI provider slot, unavailable required check or over-budget job should produce one visible blocker in the draft, not require the founder to search settings and logs.
9. Visual previews are useful approximations. Do not claim pixel-identical social rendering or verified platform publication without integration evidence.
10. Solo mode changes presentation and routing defaults, not permissions. Founder can operate alone; additional roles remain optional and protected actions retain their permission checks.

## Suggested implementation order — only after design discussion

1. Make one selected idea produce a linked, retained draft; fix incomplete output and direct result application; show inline progress/errors and remove queue jargon.
2. Implement two-review policy and agent-check orchestration with exact-version provenance, selective invalidation and no silent auto-approval.
3. Prelisted AI connections, supported-provider/model discovery and transparent spending configuration.
4. Calendar handoff/planning and read-only package previews with edit-and-reapprove behavior.
5. Compact Ideas, horizontal setup tabs, consistent selected states and paginated Activity popup.

Validate each vertical slice with the real founder journey rather than presenting a new screen as a completed integration. No automatic publishing is part of this scope.
