# RyzaLab user-experience wireframes

Status: design prototype only. The live app and planned feature implementation are unchanged. Open `index.html` in a browser; it is self-contained and works without an account/server. Reload to reset the sample session.

The persistent banner identifies sample data. There are no AI calls, provider costs, OAuth redirects, file uploads, API-key inputs or real posts. Choosing a file records its filename locally, without reading/parsing it. Editable sample text/settings stay in memory for this prototype session only. Publication states and research results are illustrative, never claimed as actual API outcomes.

## Review files

- `index.html`: clickable prototype; download and open in a browser.
- `RyzaLab-Clickable-Preview.zip`: portable HTML plus this guide. Extract and open `index.html`.
- `RyzaLab-Wireframes.pdf`: all 22 screens, one screen per page.
- `layout-overview.png`: six-screen overview.
- `screens/`: individual full-length screen captures.

Use **Journey map** or **View all wireframes** to jump between screens. On Ideas, switch between Board and Table. Start with Home → Import calendar, then try Create → Newsletter and Reviews.

## User journeys to review

1. **Calendar import:** Home → Import calendar → choose a sample/local filename → map columns → preview duplicates/dates/destinations → confirm sample import → Calendar → select a brief → Existing Pipeline in Create → generate ideas or write directly.
2. **Ideas:** Ideas → select Existing Pipeline brief or Generate with AI / Add manually → same-window research/profile → sample sources → request inbox → Board/Table → idea details → draft. Stage changes only organise sample cards.
3. **LinkedIn writing:** Create → LinkedIn → choose Pipeline / AI / Manual → editor → sources / Agent Rules used → optional image → submit for review → prepare-only or date/time/account → one approval action → status/handoff.
4. **Combined newsletter:** Create → Newsletter → select existing posts/ideas/pipeline and add pasted text or PDF/DOCX filename → source basket → optional outline → template-based editor → image placement → include/exclude images → export controls → review. The outline is optional, not another approval gate.
5. **Agent Rules:** separate channel Instructions/skills, Context/knowledge and voice → Research Instructions/Source Preferences → standalone Ryan Humanizer → newsletter content structure and visual layout. Original downloads/replacement are shown as planned interactions; no private files are read.
6. **Images:** LinkedIn or Newsletter editor → image brief → OpenAI or Google model selection → capability/key setup preview → sample result → preview/attach/replace and choose placement → draft/export. Never purchases images automatically.
7. **Publishing:** connections → LinkedIn app/OAuth capability explanation → editor finalization → review current content/destination/date/time/timezone → approve & schedule, or approve & prepare only → scheduled/failed/uncertain sample states. Editing an approved package requires reapproval. The prototype never sends anything to LinkedIn.

## Coverage of the complete master backlog

| Backlog | Screens |
|---|---|
| IB-01: image providers and controls | Connections, image brief/result, both editors |
| IB-02: newsletter structure/layout and exports | Newsletter template, optional outline, newsletter editor |
| IB-03: calendar import/template | File selection, column mapping, import review, calendar |
| IB-04: Existing Pipeline and three entry modes | Ideas, capture/generate idea, Create, calendar brief selection |
| IB-05: general web and supplied-link research | Research results, Research Instructions/Source Preferences |
| IB-06: sector-first research rules | Research rules and search coverage |
| IB-07: Ryan Humanizer | Dedicated Humanizer screen and Rules used preview |
| IB-08: multi-source newsletters | Source basket, pasted text/document selection, outline, newsletter editor |
| IB-09: LinkedIn prepare-only integration | Connections, LinkedIn setup/capability check, review/handoff |
| IB-10: approval-controlled scheduled publishing | Review/date/time/platform/account, schedule status, edit/reapproval and failure states |

Review these as proposed screens and navigation—not proof that a provider supports a capability or that a feature is already built. Native LinkedIn draft support, newsletter destinations and other-platform publication remain capability checks in the implementation plan.

## Design verification

`node docs/previews/improvement-wireframes/render-and-check.cjs` checks navigation, sample calendar import, post images, combined newsletter text, approval and changed-version reapproval, prepare-only handoff, and mobile overflow. It captures all 22 screens and regenerates the PDF/overview. Passed with zero browser errors and zero external requests. This validates the prototype interactions, not production feature behavior.
