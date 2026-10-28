from pathlib import Path
from datetime import date
import json, zipfile
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/training/downloads/modules'
SRC=ROOT/'docs/training'
OUT.mkdir(parents=True,exist_ok=True); SRC.mkdir(parents=True,exist_ok=True)
modules=[]
def module(slug,title,role,purpose,prereq,steps,expected,exercise,troubleshooting,availability='Available in preview. Live operation requires the configured /studio workspace.'):
 modules.append(dict(slug=slug,title=title,role=role,purpose=purpose,prereq=prereq,steps=steps,expected=expected,exercise=exercise,troubleshooting=troubleshooting,availability=availability))
module('00-Start-Here','Start Here — Complete User Journey','All users','Understand the complete content journey and distinguish preview from live work.','Open the deployed Studio in Chrome. Use a desktop for your first exercise.',[
'Check the mode label. Preview says “Demo mode · saved on this device”. DE is the preview identity, not your personal account. Preview data is local to this browser; it is not shared team storage.',
'Open either avatar, then Account & appearance. Choose your theme and home layout. Use Appearance in the top bar to return to these controls.',
'Open Workflow settings. Choose the channel and review its instructions, brand references, guardrails and output requirements. Import channel packages as drafts, then submit and activate only after review.',
'Open Ideas. Add an idea manually or choose Generate with agent. Preview generates labelled local samples. Review the idea, explicitly approve it, then create a draft.',
'Open Create and select the draft. Write or edit the content, maintain separate text/media, and Save draft. Build slides or scenes only when required by the intended format.',
'Complete Intake, Evidence, Creation, Independent review, Visual review and Release check for the current version. Submit for review and explicitly approve the complete revision in Reviews.',
'Record Publication handoff for the exact approved package. Open Calendar and plan its manual publication. For drafting, editing or workflow reminders, use the separate planning actions.',
'A person publishes outside Studio. Return to Calendar → Agenda and Confirm published with the live URL and correct approved revision.',
'Open Analytics to inspect current inventory and recorded activity. Keep social reach and engagement separate: these are not connected.',
'Open Training & QA to download the modules, QA workbook and backlog. Use the QA workbook during acceptance testing. Record failures and actual results; do not mark a feature passed because its button is visible.'
],'You can explain each stage and complete one sample post without claiming a real provider call or real publication occurred.','Create a sample LinkedIn text post about documenting a routine. Complete its checks using honest human evidence. Stop before Confirm published unless you actually published a test item.','If a control is disabled, check your profile, assignment, channel and active workflow. Do not paste API keys into training files or QA evidence.')
module('01-Home-and-Navigation','Home and Navigation','All users','Find work quickly using the dashboard, channel filter, layouts and sidebar.','Have access to preview or a live workspace.',[
'Open Home. Read the current mode before entering important work.',
'Choose Command Center or Production Board in the top bar. Command Center shows channel tiles, totals and upcoming work; Production Board groups the same content by progress.',
'Choose All channels or a channel to narrow the visible records. Changing layout does not create copies of your content.',
'Use the sidebar icons to open Ideas, Calendar, Create, Reviews, Library, Analytics, Workflow settings, People & access, AI & budgets and Notifications.',
'Use Collapse sidebar / Expand sidebar to change its width. Use Unpin sidebar for an on-demand drawer; Open menu opens it. Pin sidebar makes it persistent on desktop.',
'On mobile, Open menu reveals navigation. Close it with the close control or Escape. The drawer should not remain over the selected page.',
'Open Appearance to choose display settings, then Open selected layout to return Home.'
],'The selected layout and navigation preferences survive a refresh for the same account on that device.','Switch to Production Board, refresh, switch back, collapse the sidebar, unpin it and reopen it.','If records seem missing, check the channel filter and search. Browser preferences are local and are not account settings synchronized across devices.')
module('02-Account-and-Appearance','Account and Appearance','All users','Inspect your identity and choose an accessible theme, layout and navigation style.','Your workspace has loaded.',[
'Click the initials avatar at the top right or the user control at the bottom of the sidebar. Both open Account & appearance.',
'Read Email, Assigned profiles and Workspace mode. In preview, the identity is a sample account; there is no live account to sign out.',
'Under Home layout, select Command Center or Production Board. Click Open selected layout to see it.',
'Under Color theme, choose Midnight Teal or Daylight Teal. Check that text, forms, calendar events and focus outlines remain readable.',
'Under Navigation, set Pin sidebar and Expand sidebar as preferred. Refresh and verify the choices remain.',
'In a live session, use Sign out on this page. In preview, Open live sign-in takes you to /studio; actual authentication depends on live configuration.'
],'Both avatars open a useful account page; theme and layout choices visibly apply and persist.','Select Daylight Teal, refresh, return to Midnight Teal, and confirm your email/profile labels.','Role changes are managed in People & access, not by clicking your own role label. Appearance changes do not grant permissions.')
module('03-Ideas','Ideas — Manual and Agent-Assisted','Creator, editor, manager, founder or permitted administrator','Capture ideas, request candidate ideas and require human selection before drafting.','Have an active channel workflow. Live generation additionally needs an Ideas provider binding, validated pricing, budgets and a worker.',[
'Open Ideas and select the relevant channel. Review existing ideas to avoid duplicates.',
'For your own idea, click Add manually, enter its title, angle and channel, then save. The idea begins pending.',
'For agent-assisted candidates, click Generate with agent. Enter Topic / Brief, Audience, Quantity, Channel and source notes or URLs.',
'In preview, submit Preview sample ideas. These are local examples, explicitly labelled, and do not use a paid API.',
'In live mode, review the configured model and budget settings first. Submit only when you authorize the request. Paid jobs can wait for cost confirmation. Current-web research remains unavailable until its adapter is built; supplied sources are not automatically browsed.',
'Read each returned card. Check specificity, supporting evidence needed, channel fit and repetition. Agent results remain pending and do not approve themselves.',
'Explicitly approve, reject or revise the idea. Use Create draft on an approved idea to start a separate content item.',
'For recurring idea work, use the recurrence controls where available. A recurring reminder is not standing permission to bypass budget confirmation or run a paid job.'
],'Ideas keep their origin and pending status until a human decides; approved ideas can seed drafts.','Generate three preview ideas about recovery routines for family caregivers, approve one and create a draft.','Missing provider connection: configure the Ideas function in AI & budgets and activate the mapping. Research unavailable is an honest limitation, not a successful search. Never cite a source the agent did not actually access.')
module('04-Create','Create — Writing, Slides and Scenes','Creator or editor assigned to the item; founder/admin as permitted','Create and maintain the written draft and selected media as separate dependencies.','Start from an approved idea or Create content. Know your intended channel and format.',[
'Open Create and click a content title, or Create content and enter its working title, channel, format and optional publication account.',
'Edit Content text, title and metadata. Replace placeholders with verified facts; do not invent personal experience or unsupported promises.',
'Save draft before switching work. Concurrent edits can be rejected rather than silently overwriting another editor; reload and compare versions.',
'For carousels, use the slide editor to edit copy and supported layout fields. For video, use scenes, scripts, narration, captions and aspect ratio controls. Script-only scenes are not finished rendered video.',
'Use available generation controls only with a live qualified provider; preview must not be treated as genuine model output. Review every generated result.',
'Use DOCX import/export as needed. A linked Google Doc requires live OAuth configuration; preview fetching intentionally reports unavailable rather than pretending to sync.',
'Use editable source export to retain supported slide/scene data. PNG/PDF are flattened exports; they are not a full design-editor source format.',
'Complete the visible stage checks and Submit for review. Do not claim Independent review was an agent review unless a real review result supports it.',
'When changing approved text, keep the old approval snapshot. Recheck affected stages; unchanged media need not be generated again.'
],'The draft saves with a new revision; text edits preserve unchanged visual review while affected factual/release checks reopen.','Create a text post, save it, export DOCX, change one paragraph and save again. Verify the previous version remains in history.','Cannot approve video: complete scene media, not just scripts. Cannot save: check stale revision errors and required fields. Uploaded media must be retained Studio assets for live package approval.')
module('05-Reviews-and-Approvals','Reviews — Nine Stages and Human Approval','Reviewer/manager with grants, founder or authorized approver','Release the exact reviewed package while preserving evidence and human authority.','Have a saved draft and active workflow. Only authorized profiles can approve packages.',[
'Open the draft stage tracker. Intake confirms topic, audience, channel and selected source.',
'Record Evidence after checking factual claims, provenance and permissions. If there are no external factual claims, explain that explicitly; do not skip the stage.',
'Record Creation once the required text and media are present. Record Independent review with the actual reviewer and findings. Founder self-review is allowed but must be described truthfully.',
'Record Visual review after inspecting required images, slides, crops, captions or scenes. N/A is only for a genuinely text-only format and needs a meaningful reason.',
'Record Release check against the exact current text, media, active workflow and protected rules. A hold or revise decision reopens later checks.',
'In Reviews, compare the submitted revision and choose Approve revision, request changes or reject as appropriate. All six prior checks must be current before approval.',
'Approval creates an immutable package snapshot. It does not publish anything, and it cannot waive misinformation or misrepresentation controls.',
'Open the approved content and record Publication handoff for the exact package to be exported or copied. A different approved package needs its own handoff.',
'After a person actually publishes, record Publication record through Calendar → Confirm published and provide the correct URL.'
],'Only a human can approve; approval, handoff and publication refer to the exact package and retain their history.','Try approving before the six checks: it must fail. Complete the checks, approve, edit text and verify the old package is retained.','Stale workflow/rule/revision: reread current content and repeat affected checks. Founder pricing exceptions are exact-wording/revision scoped; they do not override factual blockers.')
module('06-Calendar','Calendar — Drafting, Editing, Workflows and Publication','Users permitted to edit the target; authorized publication planners','Plan work and manual publication, open the correct target, and record completion.','A draft or workflow must already exist for work tasks. Publication requires an approved package.',[
'Open Calendar. Choose Month or Agenda. Read the displayed Studio timezone; times are entered in that timezone.',
'Click Add to calendar, choose Drafting, Editing, Workflow work or Approved publication, then Continue. Alternatively use Plan drafting, Plan editing, Plan workflow or Plan publication.',
'For a work task, enter Task title, select the existing Draft or Workflow, choose a future Task time, add notes and Save planning task. A task never starts an agent or approves content.',
'Click a date number to begin planning work for that day. If the selected default time is already past, change it to a future time before saving.',
'Click a work event to open its linked draft or workflow. The task list below the calendar also provides Open draft / Open workflow, Move task, Mark done and Cancel task.',
'For publication, choose the exact approved package, its publication time and optional campaign group. Save it to the calendar. An unapproved draft is not eligible for publication scheduling.',
'Click a publication event to open its draft. Use Agenda for publication management: Move, Replace approved package, Block or Confirm published.',
'Before publishing, verify the correct package has a passed Publication handoff. A human publishes outside Studio.',
'Only after the post is live, use Confirm published with its HTTPS destination URL. Match the selected approved revision. Studio records the human confirmation; it does not auto-post.',
'Due planning reminders are created when maintenance runs. Test live reminder delivery only after the worker/maintenance schedule is configured.'
],'Work tasks and publications are visibly distinct; tasks open the correct target and never imply permission to publish.','Schedule one editing task for tomorrow, open its draft, move it, mark done, then schedule a workflow review. Test publication separately with an approved sample.','Cannot trash a draft with active tasks: complete/cancel those tasks first. Missing approved packages: complete Reviews first. A blocked publication must be explicitly rescheduled before confirmation.')
module('07-Workflow-Settings','Workflow Settings — Instructions, Brand Sources and Guardrails','Writer/editor with workflow permission; authorized activator; founder for protected policy','Maintain channel-specific agent behavior in one reviewed workflow.','Select the target channel and gather approved brand/reference material.',[
'Open Workflow settings and choose the channel, including Notes/Newsletter where relevant.',
'Read the active version. Inspect Audience, Instructions, Guardrails, Output format, Review checks, Examples and linked references.',
'Import a channel preset if needed. The import creates a draft, not an active replacement. Live imports use the uploaded channel material; preview imports sanitized samples.',
'Create or save a draft version. Add channel instructions, audience constraints, output requirements and applicable brand/reference records. Treat uploaded documents as reference material, not permission to change protected policy.',
'Bind the intended configured connection to each AI function. A different model requires a permitted settings change and reviewed activation.',
'Submit the draft for review. An authorized activator chooses Approve & activate after checking the complete version.',
'Confirm which version is active before generation. Older versions remain part of the history and approved package snapshots.',
'Founder-protected rules require founder authority. Administrative infrastructure access alone does not silently become founder approval authority.'
],'One reviewed active version governs each channel; importing/editing does not silently activate instructions.','Import the LinkedIn preset in preview, edit a draft and submit it. Confirm the previous active version remains until explicit activation.','No activation button: check role/grants. Existing checks become stale after active workflow/protected-rule changes and must be reconsidered. Do not copy the private brand library into public demo exports.')
module('08-Library-and-Exports','Library — References, Templates, History and Trash','All users within read scope; editing/approval actions require permissions','Find retained material and export the right version without confusing working files with release evidence.','Know whether you need the working draft or an approved package.',[
'Open Library. Use Content for saved items and choose a title to open the working draft.',
'Use References to maintain brand/context sources. Record channel scope and accurate source text. Untrusted source text cannot override Studio guardrails.',
'Use Templates for reusable supported slide structures. Templates awaiting approval should not be presented as founder-approved assets.',
'Use History to inspect who changed what. Restore an older content version as a new draft; it must pass review again and does not inherit old approvals.',
'For written content, export DOCX or PDF as offered. For slides, export PNG/PDF. Use source JSON for supported editable structure and subtitles for caption timing.',
'Export an approved package from Reviews when preparing a release. Do not substitute a later edited draft for the approved version.',
'Use Trash for deleted working content. Recovery is subject to the 90-day policy and dependency protections. Approved release snapshots are retained separately.',
'For MP4, distinguish the implemented local composition tool from pending fully hosted AI scene-generation/render orchestration. A script export is not an MP4.'
],'Exports contain the selected version; restored drafts re-enter review and protected snapshots remain retained.','Export a draft as DOCX and a slide as PNG, then restore an earlier text version and inspect its new draft status.','Missing media export: ensure assets exist and are supported/accessible. Flattened PDF/PNG are not editable design layers. Active planning/publication dependencies can prevent Trash actions.')
module('09-People-and-Permissions','People and Access — Profiles and Scoped Grants','Administrator with membership permission; founder for founder policy','Assign membership by email while supporting a solo founder or a larger team.','Live authentication and database must be configured for actual teammate access.',[
'Open People & access. Review existing members, profiles and any scoped grants.',
'Choose the add-member control. Enter the teammate email exactly. Assign only the profiles needed: founder, administrator, manager, editor, creator or viewer.',
'When supported by the live member form, use an initial password to create a sign-in account without an invitation email. Share it through a separate secure channel; never put it in the QA workbook.',
'One person can have multiple profiles. Explicitly assigning Founder grants founder authority and must be deliberate and auditable.',
'Use scoped grants only if needed. The current advanced form accepts JSON. Channel/content/account/function restrictions must match within one grant; ask the administrator to validate complex grants.',
'Test the member in a separate browser profile. Verify assigned drafts, read visibility and allowed actions before granting broader access.',
'Edit profiles or revoke membership as responsibilities change. Confirm the account loses access after revocation.',
'In preview, member changes are local demonstrations; they do not invite a real person or create a Supabase account.'
],'Access is enforced by server/database rules and scoped grants, not just hidden UI controls.','In preview, add a sample viewer profile. For live acceptance, test a real invited viewer in a separate session and verify editing/approval are denied.','Cannot log in: verify actual account provisioning and membership, not just a preview row. Founder authority and administrator access are distinct. Keep email addresses used in QA limited to test accounts.')
module('10-AI-and-Budgets','AI and Budgets — Providers, Models and Cost Controls','Founder and administrators granted AI-settings access','Configure providers by function and control paid requests and retries.','Use live credentials only in the secure settings form or server environment; never in documents.',[
'Open AI & budgets. Choose the function: research, ideas, text, review, image, video or audio.',
'Add the supported provider, exact accessible model ID and relevant API key. Different functions can have different connections. A text-only model does not become an image/video generator because it has a key.',
'In preview, keys are discarded and validation is unavailable. In live mode, validate supported model access and qualify sample quality before activation.',
'Configure conservative request allowances and qualified pricing. Missing/unqualified prices keep paid execution blocked.',
'Set monthly/per-request and relevant function/user/channel caps. Choose confirmation thresholds only after sample cost evaluation.',
'Activate the intended connection mapping in the channel workflow. Creating a connection alone does not switch an active workflow.',
'Review queued jobs and reservations. Confirm an awaiting-confirmation job only after checking scope and estimated cost.',
'If a dispatched outcome is unknown, reconcile it before retrying. Do not automatically rerun a potentially charged request.',
'Compare actual reconciled costs with reservations. Hosting/storage are separate from AI budget caps.'
],'Paid generation stays blocked until provider, pricing, budget and execution requirements are met.','Preview an unconfigured generation request and verify it reports the missing setup honestly. Perform paid sample tests only in a separately authorized live test.','Invalid model: use an ID your provider account actually exposes. No request allowance/rate card: configure and qualify it; do not invent prices or bypass caps. Full video/audio provider qualification remains pending.')
module('11-Analytics','Analytics — Content, Publication and Activity','All users within their permitted read scope','Interpret real Studio metrics without confusing records with social engagement.','Create content and test planning/review flows first to generate meaningful records.',[
'Open Analytics in the sidebar. Check the channel filter; metrics reflect records visible to your profile.',
'Read current inventory: Content items, In human review, Approved content, Published content, Planned publications and Open planning tasks. These inventory totals are all time.',
'Choose Activity period: Last 7, 30 or 90 days. Read items updated, approval snapshots and human publication confirmations for that rolling period.',
'Inspect the daily chart and View daily activity data. Daily grouping is labelled UTC. Approval counts are snapshots, so one content item can produce several approvals.',
'Read Content by channel. Approved/published content totals count unique content items, not every approval or repost task.',
'Review Next required checks to see where unpublished work is waiting. Review changes requested and blocked publication tasks.',
'Inspect AI usage and cost. Recorded actual cost requires reconciliation; reservations are budget holds, not confirmed charges.',
'Read Social performance. Views, impressions, clicks, followers and engagement are Not connected and must not be reported as zero performance.'
],'Metrics change in line with actual records and filters; no social engagement is fabricated.','Create an editing task, check Open planning tasks, mark it done and verify the count decreases. Compare approval snapshots with unique approved content.','Missing teammate records may be correct permission filtering. Published means a human supplied a URL, not independently verified reach. Deleted working content is excluded from current inventory.')
module('12-Notifications','Notifications — Inbox and Reminders','Each member for their own inbox','Read workflow reminders and understand delivery prerequisites.','Have an event that creates a notice. Due reminders require maintenance to run.',[
'Click the bell or Notifications to open your inbox.',
'Read the event and affected content/task. Open the corresponding section to take the required action.',
'Use available read/dismiss controls to clear the unread state after reviewing the message.',
'For due planning work, open Calendar and use Open draft / Open workflow. Complete or move the task as appropriate.',
'For publication reminders, inspect the exact package and handoff before posting. A reminder never publishes automatically.',
'Test email only after the transactional email service and dispatch schedule are configured. Password login is independent of notification email.',
'If no reminder appears, check the task time, timezone, maintenance schedule and your membership before assuming an event failed.'
],'Inbox notices identify events honestly and never substitute for approval or publication.','Read the sample welcome notice, then test a due task reminder in an authorized maintenance test.','Preview actions do not send email. Repeated maintenance should not duplicate the same due reminder. A stale reminder can remain in history after the underlying task changes.')

for m in modules:
 lines=[f"# RyzaLab Training — {m['title']}",'',f"Version: 2026-10-28 | Audience: {m['role']}",'','## Objective',m['purpose'],'','## Before you start',m['prereq'],'','## Availability',m['availability'],'','## Step-by-step workflow']
 lines += [f"{i}. {step}" for i,step in enumerate(m['steps'],1)]
 lines += ['','## Expected result',m['expected'],'','## Practice exercise',m['exercise'],'','## Common problems and boundaries',m['troubleshooting'],'','## Completion checklist','- I can locate this section and explain its purpose.','- I completed the practice exercise or marked the live dependency as blocked.','- I recorded actual results in the QA workbook.','- I did not treat preview samples as real agent output or live publication.','']
 text='\n'.join(lines);(SRC/(m['slug']+'.md')).write_text(text)
 doc=Document();sec=doc.sections[0];sec.header.paragraphs[0].text='RyzaLab | Content Studio Training'
 doc.styles['Normal'].font.name='Calibri';doc.styles['Normal'].font.size=Pt(11)
 for line in lines:
  if line.startswith('# '):doc.add_heading(line[2:],0)
  elif line.startswith('## '):doc.add_heading(line[3:],1)
  elif line.startswith('- '):doc.add_paragraph(line[2:],style='List Bullet')
  elif len(line)>2 and line.split('.')[0].isdigit():doc.add_paragraph(line.split('. ',1)[1],style='List Number')
  elif line:doc.add_paragraph(line)
 sec.footer.paragraphs[0].text='Training checkpoint: 2026-10-28. Preview and live requirements are different. Never include credentials in test evidence.'
 doc.save(OUT/(m['slug']+'.docx'))
 (OUT/(m['slug']+'.md')).write_text(text)
index='# RyzaLab Training Modules\n\nOne standalone module per section. Start with module 00. Companion QA/backlog workbook: RyzaLab-QA-and-Backlog.xlsx.\n\n'+'\n'.join(f"- [{m['title']}]({m['slug']}.md)" for m in modules)+'\n'
(SRC/'README.md').write_text(index);(OUT/'README.md').write_text(index)
(OUT/'modules.json').write_text(json.dumps(modules,indent=2))
print('Wrote',len(modules),'training modules')

wb=Workbook();readme=wb.active;readme.title='Start Here'
for row in [
 ['RyzaLab — Manual QA and Delivery Backlog','2026-10-28'],
 ['Purpose','Test the dashboard section by section and track delivery gaps.'],
 ['How to test','Filter QA Cases by Section and Environment. Run steps with test data, select Status, and record actual results.'],
 ['Test statuses','Not run / Pass / Fail / Blocked / Not applicable. Not run is the default; workbook rows are not evidence of execution.'],
 ['Preview','Browser-local sample data. No actual provider generation, OAuth, team provisioning, email or automatic publishing.'],
 ['Live validation','Use an authorized test workspace. Confirm credentials, migration, worker, pricing and budgets before testing paid features.'],
 ['Backlog status','Done = implemented and locally checked; Built—needs live validation = credentialed acceptance pending; In progress = follow-up under verification; Pending build = missing implementation; Decision needed = selection/approval outstanding.'],
 ['Safety','Never store passwords/API keys in this workbook or screenshots. Confirm published only for a real test publication.'],
 ['Data scope','Analytics reflects permitted records; human publication confirmation is not independent social-platform verification.'],
 ['Current baseline','Tested review release plus account/calendar/analytics/training follow-up. See GitHub main and release notes for the deployed commit. Done describes local verification, not credentialed live acceptance.'],
 ['Training','13 separate Word/Markdown modules in the training ZIP. Module names are indexed on Training Index.'],
 ['Recommended order','Smoke → Navigation → Content/ideas → Workflow/review → Calendar → Analytics → Export → Permissions/live integrations.'],
 ['Defects','Record one issue per row with reproduction, expected/actual result and screenshot link. Retest after a fix.'],
 ['Backlog ownership','Owner and target dates are intentionally blank for your team to assign. Priorities are recommendations.']]:readme.append(row)
readme.column_dimensions['A'].width=28;readme.column_dimensions['B'].width=115
qa=wb.create_sheet('QA Cases');headers=['Test ID','Section','Feature / scenario','Priority','Environment','Prerequisites / test data','Steps to execute','Expected result','Status','Actual result','Evidence / screenshot link','Defect ID','Tester','Test date','Notes'];qa.append(headers)
cases=[]
def add(section,feature,steps,expected,env='Preview',priority='P1',pre='Open the deployed Studio with a fresh test browser profile.'):
 cases.append([f'QA-{len(cases)+1:03}',section,feature,priority,env,pre,steps,expected,'Not run','','','','','',''])
# Explicit manual scenarios, not claims that these tests were run.
for f,st,ex in [
 ('Load dashboard','Open the site in Chrome; wait for initial load.','Dashboard renders without a blank screen or runtime error.'),
 ('Browser tab title','Inspect the Chrome tab title.','Title reads Content Studio RyzaLab.'),
 ('Browser tab icon','Inspect tab icon; reopen in a fresh tab if cached.','Branded Studio icon appears instead of the generic globe.'),
 ('Preview disclosure','Inspect the top bar and account page.','Preview identity and browser-local mode are visible.'),
 ('Top profile control','Click the top-right initials avatar.','Account & appearance opens and displays email, roles and mode.'),
 ('Sidebar profile control','Open sidebar; click the bottom user control.','Same account page opens; no silent no-op or unexpected sign-out.'),
 ('Keyboard navigation','Use Tab and Shift+Tab through navigation and forms.','Focus is visible and interactive controls can be activated.'),
 ('Mobile smoke','Open at approximately 390 px viewport width; navigate each main section.','No unusable page-wide horizontal overflow; drawer can open and close.')]:add('Smoke and branding',f,st,ex)
for f,st,ex in [
 ('Command Center','Choose Command Center, then Home.','Channel tiles and summary cards render.'),
 ('Production Board','Choose Production Board.','Same records are grouped by progress; no records are duplicated.'),
 ('Layout persistence','Choose Production Board; refresh.','Production Board remains selected for this actor/device.'),
 ('Appearance discoverability','Click Appearance in the top bar.','Theme, both layouts and navigation controls are easy to locate.'),
 ('Midnight theme','Choose Midnight Teal; inspect editor, calendar and dialog.','Dark theme has readable text, borders and focus.'),
 ('Daylight theme','Choose Daylight Teal; inspect editor, calendar and dialog.','Light theme has dark readable text and visible controls.'),
 ('Theme persistence','Choose Daylight Teal; refresh; return to Midnight.','Theme persists without changing content.'),
 ('Collapse sidebar','Click Collapse sidebar, then Expand sidebar.','Sidebar changes width and controls remain labelled.'),
 ('Sidebar pinning','Unpin sidebar; Open menu; Pin sidebar.','Drawer opens on demand and pinned navigation returns.'),
 ('Drawer Escape','On mobile open menu, press Escape.','Drawer closes and focus returns sensibly.'),
 ('Channel filter','Select a channel with no content, then All channels.','Filtered records and counts update; all records return.'),
 ('Notifications entry','Click the bell.','Notifications section opens.')]:add('Navigation and appearance',f,st,ex)
for f,st,ex,*env in [
 ('Manual idea','Ideas → Add manually; enter title, angle and channel; save.','Pending idea appears with the entered details.'),
 ('Required idea fields','Submit manual idea with missing title.','Validation prevents creation of an empty idea.'),
 ('Sample idea batch','Generate with agent; enter topic/audience and quantity 3; Preview sample ideas.','Three clearly labelled local sample cards appear pending.'),
 ('Agent quantity bounds','Try quantity 0, then 21.','Invalid quantity is rejected; no oversized batch is imported.'),
 ('Idea persistence','Save an idea; refresh.','Idea remains in the same browser profile.'),
 ('Approve idea','Approve one pending idea.','Only the selected idea becomes approved.'),
 ('Create draft from idea','Approve an idea; choose Create draft.','Linked draft opens with intended title/channel.'),
 ('Reject idea','Reject a pending idea using available control.','Idea is not presented as approved or automatically drafted.'),
 ('Channel-specific ideas','Select LinkedIn then Reddit.','Cards match selected channel.'),
 ('Live missing binding','In authorized live workspace with no Ideas connection, submit generation.','Clear setup error; no provider call or unpriced job.','Live'),
 ('Live paid idea request','With qualified Ideas binding, pricing and budget, authorize quantity 3.','One queued job is created; actual returned cards enter pending review.','Live'),
 ('Research unavailable','In live mode select web research while no qualified adapter exists.','Explicit unavailable result; no fabricated researched output.','Live')]:
 add('Ideas',f,st,ex,env[0] if env else 'Preview')
for f,st,ex in [
 ('New draft','Create content; enter working title/channel/format; save.','A separate draft is created and can be opened.'),
 ('Edit text','Change Content text and metadata; Save draft; reopen.','Latest saved text and metadata remain.'),
 ('Slide copy','Open a carousel draft; edit slide title/body/layout; save.','Supported slide changes persist independently of text.'),
 ('Scene script','Edit a video scene script, duration, narration and captions.','Scene source data is retained; UI does not imply finished rendered video.'),
 ('Stale save','In two live editor sessions save conflicting revisions.','Stale save rejects rather than silently overwriting another editor.'),
 ('DOCX import','Import a small valid DOCX containing a unique phrase.','Phrase appears in draft; displaced text remains in history.'),
 ('Editable source roundtrip','Export source JSON; re-import supported source file.','Supported layout/scenes/audio/captions round-trip without invented fields.'),
 ('Invalid source import','Import malformed or unsupported source JSON.','Clear validation error; existing draft remains intact.'),
 ('Submit review','Save a written draft; Submit for review.','Item appears in Reviews; no approval is inferred.'),
 ('Text-only edit dependencies','Complete visual check; change only body copy.','Unchanged visual check remains; affected evidence/release checks reopen.'),
 ('Format change dependencies','Complete text-only visual N/A; change format to Video.','Visual N/A becomes stale; review is required before approval.'),
 ('Missing scene media','Try approving a scene containing script but no source media.','Approval blocks unfinished scene media.')]:add('Create and media',f,st,ex, 'Live' if f=='Stale save' else 'Preview')
for f,st,ex in [
 ('Missing stage gate','Attempt Approve revision without the six prior checks.','Approval rejects; no package is created.'),
 ('Sequential checks','Pass Intake, Evidence, Creation, Independent review, Visual review and Release check in order.','Each records actor, findings and current dependencies.'),
 ('Skip ahead','Try passing Release check before prior stages pass.','Command rejects skipping required checks.'),
 ('Visual N/A text only','For a genuinely text-only draft select visual N/A with meaningful reason.','N/A is allowed and reason retained.'),
 ('Visual N/A missing video','For Video format with no assets try N/A.','N/A rejects; missing assets do not make video text-only.'),
 ('Blank reason','Enter spaces only as the stage reason.','Validation rejects the meaningless reason.'),
 ('Hold check','Hold Evidence after later checks passed.','Downstream checks reopen; approval remains blocked.'),
 ('Human identity','Founder records a self-review.','Truthful human record; no fabricated independent model execution.'),
 ('Immutable approval','Complete checks and approve; then edit draft.','Old package stays unchanged; edited draft requires affected reviews.'),
 ('Changed policy','Activate a revised workflow after checks; attempt approval.','Stale workflow checks cannot approve the new version silently.'),
 ('Factual blocker','Insert [Ryan to confirm: example] or prohibited factual promise; attempt approval.','Unresolved/blocked wording prevents approval.'),
 ('Exact package handoff','Approve twice; attempt using old handoff for new package.','New package requires its own handoff.')]:add('Reviews and stage integrity',f,st,ex,priority='P0')
for f,st,ex in [
 ('Calendar navigation','Click Calendar in the sidebar.','Month view and planning controls appear.'),
 ('Date click','Click a future date number.','Add to calendar type selector opens.'),
 ('Plan drafting','Add to calendar → Drafting; select existing draft; future time; save.','Drafting task appears without creating approval/publication/AI job.'),
 ('Plan editing','Plan editing; select draft; save future time.','Editing task appears in day cell and task list.'),
 ('Plan workflow','Plan workflow; select workflow; save future time.','Task links to existing workflow; no automatic agent execution.'),
 ('Open task event','Click editing task in month view.','Correct draft opens.'),
 ('Open workflow task','Click workflow task or Open workflow.','Workflow settings opens for correct channel.'),
 ('Move work task','Click Move task; choose different future time.','Calendar placement/time updates.'),
 ('Complete work task','Mark done on planned editing task.','Task becomes done; open-task analytics decreases.'),
 ('Cancel work task','Cancel a planned task.','Task is removed from active calendar/list; does not delete draft.'),
 ('Reject past time','Try saving a task yesterday.','Validation rejects past scheduling.'),
 ('Empty target','Try planning work without an eligible draft/workflow.','Helpful instruction points to creating target first.'),
 ('Plan approved publication','Approve package; Plan publication; choose exact package/time.','Manual publication task appears for selected revision.'),
 ('Open publication','Click publication event.','Correct draft opens; Agenda remains available for task management.'),
 ('Agenda actions','Open Agenda; move/block/replace package using available controls.','Action applies to selected task, with correct package revision.'),
 ('No handoff confirmation','Try Confirm published for package with no passed handoff.','Confirmation rejects missing exact-package handoff.'),
 ('Human publication URL','Actually publish an authorized test item; record valid URL and expected package.','Human-confirmed publication record retained; no automatic posting.'),
 ('Wrong destination','Try confirming a LinkedIn task with unrelated platform URL.','Invalid destination rejects.'),
 ('Timezone','Schedule known future local time; compare Month/Agenda/task details.','Same intended time is shown in configured Studio timezone.'),
 ('Trash dependency','Try trashing a draft with an active planning task.','Trash blocks until task resolved.')]:add('Calendar and planning',f,st,ex,'Live' if f=='Human publication URL' else 'Preview',priority='P0' if f in ['No handoff confirmation','Wrong destination'] else 'P1')
for f,st,ex in [
 ('Open analytics','Click Analytics in sidebar.','Metrics, activity, channel table, check backlog and cost sections render.'),
 ('Inventory totals','Compare content/review/approved/published counts to visible records.','Unique content totals match current visible nondeleted records.'),
 ('Activity period','Switch 7 / 30 / 90 days.','Period activity changes; all-time inventory labels stay clear.'),
 ('Daily data','Expand View daily activity data.','Accessible daily rows match chart and UTC labels.'),
 ('Channel analytics','Filter to a channel with known content.','Metrics and table reflect only that channel.'),
 ('Planning metric','Create task; inspect open count; complete task; refresh analytics.','Open count increases/decreases correctly.'),
 ('Approval versus content','Approve two revisions of same content.','Approval snapshots can increase twice; unique approved content counts once.'),
 ('Publication meaning','Compare published content with human confirmation records.','Only human-confirmed records count as published.'),
 ('Cost distinction','Inspect actual cost and budget reservations.','They are separate; missing reconciliation is not presented as confirmed zero charge.'),
 ('No social fabrication','Inspect social performance section.','Views/impressions/clicks/engagement show Not connected, not fabricated metrics.')]:add('Analytics',f,st,ex)
for f,st,ex in [
 ('Channel instructions','Workflow settings → choose channel; inspect audience/instructions/guardrails.','Correct channel version details appear.'),
 ('Preset import','Import channel package.','New draft version is created; current active version remains unchanged.'),
 ('Save workflow draft','Edit instructions, audience and output requirements; save.','Draft version persists without implicit activation.'),
 ('Submit and activate','Submit draft; authorized actor Approve & activate.','Exactly one active version for that channel.'),
 ('Private source scope','Inspect public preview import.','Sanitized sample instructions only; private brand brain not exposed.'),
 ('References','Library → References; add scoped source; link via workflow form.','Source retained in appropriate scope and selected workflow.'),
 ('Protected policy','Nonfounder administrator tries changing founder protected rules.','Requires explicit founder authority; no administrative bypass.')]:add('Workflow settings and brand',f,st,ex,priority='P0' if f in ['Private source scope','Protected policy'] else 'P1')
for f,st,ex in [
 ('DOCX export','Export written draft DOCX; open in Word/Docs.','Real paragraphs and expected revision label exist.'),
 ('PDF export','Export written content PDF; open file.','Readable content from selected revision, not blank output.'),
 ('Slide PNG/PDF','Export a populated slide as PNG and slide PDF.','Correct copy, colors and supported positions appear.'),
 ('Approved package export','Export from Approved packages in Reviews.','Snapshot matches approved revision, not later draft edits.'),
 ('History restore','Restore an older content revision.','New draft created with review reset; old package unchanged.'),
 ('Trash recovery','Trash unused draft; find Trash and restore.','Draft recoverable; protected dependency rules remain.'),
 ('Template approval','Create pending template; approve as eligible founder.','Approval status truthful; nonpermitted profiles cannot approve.'),
 ('Video source export','Export editable video project and subtitles.','Real source/caption files; not mislabelled as rendered MP4.')]:add('Library and exports',f,st,ex)
for f,st,ex,env in [
 ('Preview member honesty','Add sample member in preview.','Local membership row only; no email or real account created.','Preview'),
 ('Password login','Sign in using provisioned invited test account.','Access granted without OTP/SMTP flow.','Live'),
 ('Google login','Use Google with already-invited test account after OAuth setup.','Same membership applies; uninvited Google account denied.','Live'),
 ('Create live teammate','Admin adds email/profile with supported initial password form.','Real account and membership provisioned without invitation email.','Live'),
 ('Viewer denial','Sign in as viewer; attempt edit/approve/change roles.','Server denies forbidden actions.','Live'),
 ('Assigned content scope','Creator opens assigned and unassigned drafts in separate sessions.','Only permitted draft data and generation context visible.','Live'),
 ('Scoped grants','Test channel/content/function limited grant.','Every restriction must match in a single grant.','Live'),
 ('Revoke account','Admin revokes test membership; revoked user refreshes/acts.','Access and mutations denied.','Live'),
 ('Sign out','In live Account & appearance click Sign out.','Session ends and login returns.','Live')]:add('People and authentication',f,st,ex,env,priority='P0')
for f,st,ex,env in [
 ('Per-function model setup','Add separate Ideas and Text connections in preview.','Separate model/provider settings retained; preview keys discarded.','Preview'),
 ('Key privacy','Save live key; inspect subsequent UI/API payloads/logs.','Secret masked; stored server-side encrypted; not returned after save.','Live'),
 ('Model validation','Validate exact accessible provider model ID.','Genuine validation result; invalid IDs rejected.','Live'),
 ('Unpriced request','Try request without qualified rate card/allowance.','Paid execution blocked.','Live'),
 ('Budget hard cap','Request above monthly/per-request allowance.','No queued/reserved paid job beyond cap.','Live'),
 ('Confirmation threshold','Submit job needing explicit cost confirmation.','Waits; no spend until explicit confirmation and budget recheck.','Live'),
 ('Idempotency','Repeat same submitted job key after interrupted response.','No duplicate provider dispatch/reservation/job.','Live'),
 ('Unknown outcome','Simulate dispatched timeout in controlled test.','Outcome held for reconciliation; no blind automatic retry.','Live'),
 ('Google Docs fetch','Link a test Doc and fetch latest with OAuth configured.','Real text fetched; displaced Studio version retained.','Live'),
 ('Docs conflict','Change Studio draft while fetch is in progress.','Stale import rejects rather than losing edits.','Live'),
 ('Notifications inbox','Open bell, read welcome/event notice.','Inbox opens with correct unread state.','Preview'),
 ('Due planning notice','Run authorized maintenance after task due time twice.','One due reminder; no generation/publication starts.','Live'),
 ('Notification email','Configure approved email service; dispatch to test member.','Delivery result honest and no duplicate same-event sends.','Live')]:add('AI and external integrations',f,st,ex,env,priority='P0' if f in ['Key privacy','Budget hard cap','Idempotency','Unknown outcome'] else 'P1')
for f,st,ex in [
 ('Training hub','Open Training & QA from the sidebar.','Download pack, QA workbook, backlog and section modules are listed.'),
 ('Word module download','Download Calendar (Word); open in Word or Google Docs.','One readable standalone module contains steps, exercise and known limitations.'),
 ('QA workbook download','Download QA workbook; open in Excel.','QA Cases, QA Summary, Backlog, Defects, Test Data and Training Index exist; manual statuses begin Not run.'),
 ('Backlog download','Download backlog; filter Status.','Done, Built—needs live validation, Pending build and Decision needed are clearly distinguished.')]:add('Training and QA',f,st,ex)
for row in cases:qa.append(row)
status=DataValidation(type='list',formula1='"Not run,Pass,Fail,Blocked,Not applicable"');status.errorTitle='Choose a test status';status.error='Select a listed status.';status.showErrorMessage=True;qa.add_data_validation(status);status.add(f'I2:I{qa.max_row}')
for val,color in [('Pass','D9EAD3'),('Fail','F4CCCC'),('Blocked','FCE5CD'),('Not run','E7EEF3')]:qa.conditional_formatting.add(f'I2:I{qa.max_row}',FormulaRule(formula=[f'I2="{val}"'],fill=PatternFill('solid',fgColor=color)))
backlog=wb.create_sheet('Backlog');backlog.append(['Item ID','Area','Item / outcome','Status','Priority','Acceptance criteria / definition of done','Dependency / blocker','Owner','Target date','Evidence / notes'])
items=[]
def item(area,name,status,priority,criteria,dependency='',notes=''):items.append([f'BL-{len(items)+1:03}',area,name,status,priority,criteria,dependency,'','',notes])
D='Done';L='Built—needs live validation';P='Pending build';I='In progress';N='Decision needed'
for area,name,criteria in [
 ('Navigation','Midnight Teal styling','Readable dark desktop/mobile screens with clear focus.'),
 ('Navigation','Two home layouts','Command Center and Production Board share records and persist preference.'),
 ('Navigation','Collapse/pin navigation','Desktop width/pinning and mobile drawer work with keyboard.'),
 ('Ideas','Manual and labelled preview ideas','Human approval required; sample origin visible.'),
 ('Workflow','Versioned instructions and channel imports','Imports stay draft; activation explicit; private source stays server-side.'),
 ('Review','Nine-stage exact-version approval','First six checks required; holds/stale checks block; snapshots immutable.'),
 ('Review','Selective invalidation','Text-only edits preserve visual checks; factual edits reopen evidence.'),
 ('Publishing','Exact-package handoff and manual record','No publication confirmation without correct handoff and valid URL.'),
 ('Exports','DOCX/PDF/PNG/source/subtitles','Supported individual exports contain real selected revision data.'),
 ('Retention','90-day Trash and protected snapshots','Dependency protection, history restore as draft and retained release evidence.'),
 ('Video','Local MP4 composition','Tested local composition in three ratios with captions/audio; hosted AI orchestration separate.')]:item(area,name,D,'P1',criteria,notes='Baseline locally tested, 997a3ff; no claim of live integration acceptance.')
for area,name,criteria in [
 ('Account','Both avatar controls and appearance page','Both avatars open account details with meaningful preview/live actions.'),
 ('Branding','Browser title and favicon','Chrome tab displays Content Studio RyzaLab and branded icon.'),
 ('Appearance','Selectable accessible color themes','Midnight/Daylight themes persist and remain readable.'),
 ('Calendar','Draft/editing/workflow planning tasks','Future work tasks can be created, opened, moved, completed and cancelled without approval or spend.'),
 ('Calendar','Publication event opens content','Month event opens correct item; Agenda manages exact publication task.'),
 ('Analytics','Real Studio activity and inventory','Permission-filtered counts, period activity, channel totals, check bottlenecks and cost distinction.'),
 ('Training','One training document per section','13 standalone Word/Markdown modules with steps, exercise and limitations.'),
 ('QA','QA workbook and delivery backlog','Manual statuses, defects and clear pending/done distinctions; downloadable files valid.')]:item(area,name,D,'P1',criteria,notes='Follow-up locally verified: 88 automated tests, production build and browser flow. Live integrations remain separately tracked.')
for area,name,criteria,dep in [
 ('Data','Live Supabase migration and data validation','Migrate test workspace, preserve existing data, verify reads/CAS/private storage.','Authorized test Supabase project and server configuration'),
 ('Auth','Password and Google live acceptance','Invited users can sign in; uninvited/revoked accounts denied.','OAuth configuration and provisioned test accounts'),
 ('People','Live account provisioning and scoped profiles','Multiple real roles and scoped grants enforced server-side in separate sessions.','Live migration/auth'),
 ('Storage','Private upload/download and approved media','Files private and durable; immutable release asset manifest checked.','Storage bucket, live credentials'),
 ('AI','Text and idea provider qualification','Real outputs imported pending; model access, quality, cost and errors validated.','Selected model, API key, priced allowance, worker'),
 ('AI','Live key/privacy acceptance','Encrypted secrets never returned after save; allowed admins only.','Encryption key and live configuration'),
 ('Google Docs','OAuth/manual fetch/conflict live validation','Real fetch and token renewal work without silent data loss.','Google OAuth app and test Doc'),
 ('Notifications','Transactional email acceptance','Authorized notices delivered and retry/idempotency verified.','Selected delivery service, credentials, dispatch worker')]:item(area,name,L,'P0' if area in ['Data','Auth','Storage'] else 'P1',criteria,dep)
for area,name,criteria,dep in [
 ('Research','Current-web source research adapter','Fetch/cite actual sources with access provenance; reject fabricated access.','Provider/tool selection; source trust boundary'),
 ('Worker','Managed durable job hosting','Deploy worker/leases/reconciliation/maintenance; restart and timeout tests.','Hosting decision and authorized service configuration'),
 ('Video','Hosted AI scene-to-final MP4 pipeline','Generate/reuse scenes, narration/captions, render and retain final outputs with human review.','Qualified providers, durable worker, storage and budget'),
 ('Audio','Qualified voice/music pipeline','Licensed/consented voices and music with sample cost/quality checks.','Provider evaluation and rights requirements'),
 ('Images','Qualified image generation and review','Real image outputs retained, editable copy separated, price/quality validated.','Provider selection, live keys and worker'),
 ('Google Docs','Optional automatic synchronization','Founder setting, conflict-safe background sync, approved versions protected.','Manual sync qualified first'),
 ('Media editor','Advanced visual layer editing','Define and implement needed manipulation beyond current copy/basic layout fields.','User priorities and supported source format'),
 ('Exports','Campaign/inventory bulk export','Defined campaign ZIP/inventory with exact versions and dependency manifest.','Export scope definition'),
 ('Scale','Production-scale history/archive design','Durable scalable history outside current workspace size cap without breaking release snapshots.','Data architecture and retention design'),
 ('Operations','Backup/restore and disaster recovery acceptance','Restore test recovers content, assets and immutable snapshots.','Live hosting/storage configuration'),
 ('Operations','Monitoring and incident alerts','Worker failures, unknown charges, storage and auth failures observable with redacted logs.','Managed runtime and monitoring selection'),
 ('Review','Final independent prelaunch signoff','Re-review live permissions, stage integrity and reliability; resolve blockers.','Stable implementation; previous review ended at model capacity')]:item(area,name,L if area=='Images' else P,'P1',criteria,dep)
for area,name,criteria,dep in [
 ('Hosting','Select production worker/hosting approach','Compare cost/reliability; choose managed worker alongside web/database.','Hosting comparison in repository'),
 ('Budget','Set actual monthly cap and confirmation threshold','Choose currency/amounts after representative text/image/video sample costs.','Sample evaluation and provider rate cards'),
 ('Video','Select quality/cost/voice targets','Compare sample outputs and costs before committing provider/resolution expectations.','Authorized sample evaluations'),
 ('Branding','Supply official RyzaLab logo asset','Replace provisional Studio monogram with approved logo/icon file.','Official vector or raster asset from brand owner'),
 ('Analytics','Define optional social performance ingestion','Decide manual metrics import or separate authorized read-only analytics integration; no account access assumed.','User scope decision; publishing remains manual')]:item(area,name,N,'P2',criteria,dep)
item('AI connections','Disconnect and delete AI connections',P,'P0','Permitted admins can clear saved credentials and disconnect a connection; unused connections can be deleted; active jobs, workflow dependencies and immutable history are protected.','Explicit user instruction: backlog only; do not implement now.')
for row in items:backlog.append(row)
bstatus=DataValidation(type='list',formula1='"Done,Built—needs live validation,In progress,Pending build,Decision needed,Deferred"');backlog.add_data_validation(bstatus);bstatus.add(f'D2:D{backlog.max_row}')
summary=wb.create_sheet('QA Summary',1);summary.append(['Metric','Count']);summary.append(['Total test cases',f'=COUNTA(\'QA Cases\'!A2:A{qa.max_row})'])
for val in ['Not run','Pass','Fail','Blocked','Not applicable']:summary.append([val,f'=COUNTIF(\'QA Cases\'!I2:I{qa.max_row},"{val}")'])
summary.append(['Pass rate (executed Pass/Fail only)','=IFERROR(B4/(B4+B5),0)']);summary.cell(summary.max_row,2).number_format='0%'
summary.append(['Backlog items',len(items)])
for val in [D,L,I,P,N]:summary.append([val,f'=COUNTIF(Backlog!D2:D{backlog.max_row},"{val}")'])
defects=wb.create_sheet('Defects');defects.append(['Defect ID','Related Test ID','Section','Summary','Severity','Environment / URL / commit','Steps to reproduce','Expected result','Actual result','Evidence link','Status','Owner','Retest result','Notes'])
for i in range(1,21):defects.append([f'BUG-{i:03}','','','','','','','','','','Open','','',''])
tdata=wb.create_sheet('Test Data');
for row in [['Data','Suggested value / rule'],['Content title','QA Sample — Recovery Routine'],['Topic','Documenting recovery routines'],['Audience','Family caregivers'],['Sample quantity',3],['Text','A documented handoff can list access contacts and recovery steps. Verify any product-specific claims before release.'],['Future task','Pick tomorrow at 10:00 in the configured Studio timezone.'],['Channel','LinkedIn; repeat a small smoke test on all other channels.'],['Accounts','Use separate test founder/admin/editor/viewer accounts for live permission checks.'],['Publication URL','Only use the URL of a real authorized test publication when confirming live publication.'],['Secrets','Never paste API keys, passwords, tokens or private brand source data in the workbook.'],['Preview reset','Use a fresh browser profile for a clean start; local data is not shared across profiles.']]:tdata.append(row)
training=wb.create_sheet('Training Index');training.append(['Module','Document','Who should use it'])
for m in modules:training.append([m['title'],m['slug']+'.docx',m['role']])
for sheet in wb:
 sheet.freeze_panes='A2';sheet.sheet_view.showGridLines=False
 for cell in sheet[1]:cell.fill=PatternFill('solid',fgColor='0B3A42');cell.font=Font(color='FFFFFF',bold=True,size=11);cell.alignment=Alignment(wrap_text=True,vertical='center')
 sheet.row_dimensions[1].height=32
 for row in sheet.iter_rows(min_row=2):
  for cell in row:cell.alignment=Alignment(vertical='top',wrap_text=True);cell.font=Font(name='Calibri',size=11)
  sheet.row_dimensions[row[0].row].height=60 if sheet.title in ['QA Cases','Backlog','Defects'] else 45
 sheet.auto_filter.ref=sheet.dimensions
 sheet.sheet_properties.pageSetUpPr.fitToPage=True;sheet.page_setup.orientation='landscape';sheet.page_setup.paperSize=sheet.PAPERSIZE_A3;sheet.page_setup.fitToWidth=1;sheet.page_setup.fitToHeight=0;sheet.print_title_rows='1:1'
 sheet.oddFooter.center.text='RyzaLab | &A | Page &P of &N'
 if sheet.title not in ['Start Here','Test Data']:
  for col in sheet.columns:sheet.column_dimensions[col[0].column_letter].width=22
 for idx in range(2,sheet.max_row+1):
  if idx%2==0:
   for cell in sheet[idx]:cell.fill=PatternFill('solid',fgColor='EEF5F5')
qa_widths=[13,27,33,10,14,47,70,70,18,50,35,16,22,18,45]
for i,w in enumerate(qa_widths,1):qa.column_dimensions[qa.cell(1,i).column_letter].width=w
for i,w in enumerate([14,22,43,32,12,78,58,22,18,55],1):backlog.column_dimensions[backlog.cell(1,i).column_letter].width=w
for sheet,name in [(qa,'QACases'),(backlog,'DeliveryBacklog'),(defects,'DefectRegister')]:
 tab=Table(displayName=name,ref=sheet.dimensions);tab.tableStyleInfo=TableStyleInfo(name='TableStyleMedium2',showRowStripes=True);sheet.add_table(tab)
summary.column_dimensions['A'].width=39;summary.column_dimensions['B'].width=25
for col in ['A','B']:tdata.column_dimensions[col].width=35 if col=='A' else 115
path=OUT.parent/'RyzaLab-QA-and-Backlog.xlsx';wb.save(path)
# A focused backlog workbook for users who want to circulate just delivery status.
b=Workbook();b.remove(b.active)
for name in ['Backlog','Start Here']:
 src=wb[name];dest=b.create_sheet(name)
 for row in src:
  for cell in row:
   target=dest.cell(cell.row,cell.column,cell.value)
   from copy import copy
   target._style=copy(cell._style);target.alignment=copy(cell.alignment)
 for k,v in src.column_dimensions.items():dest.column_dimensions[k].width=v.width
 dest.freeze_panes='A2';dest.auto_filter.ref=dest.dimensions
b.save(OUT.parent/'RyzaLab-Backlog.xlsx')
# Bundle training only; workbook is independently downloadable and also included for convenience.
with zipfile.ZipFile(OUT.parent/'RyzaLab-Training-and-QA.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in OUT.glob('*'):
  if p.name!='modules.json':z.write(p,'Training/'+p.name)
 z.write(path,path.name);z.write(OUT.parent/'RyzaLab-Backlog.xlsx','RyzaLab-Backlog.xlsx')
print('QA cases:',len(cases),'Backlog items:',len(items),'Workbook:',path)

# Only these authored training materials are copied publicly; no source brand library is included.
import shutil
public=ROOT/'public/training'; public.mkdir(parents=True,exist_ok=True)
for p in list(OUT.glob('*.docx'))+list(OUT.parent.glob('*.xlsx'))+list(OUT.parent.glob('*.zip')):
 shutil.copyfile(p,public/p.name)
