# Consolidated backlog execution

User authorization: combine the earlier backlog and all subsequent feedback and implement the complete scope. IB-12 stays withdrawn. Deliver tested increments, but never represent one increment as completion of the whole backlog. v0.3.29 reliability/UX was pushed to production. v0.3.30 research/resource increment was pushed to production; hosted rollout remains to be checked. This increment does not complete the full backlog.

| Order | Item | State | Remaining acceptance/dependency |
|---|---|---|---|
| Baseline | IB-03 Excel calendar/template | Implemented in 0.3.28 | Operational workbook acceptance; retain existing data |
| Baseline | IB-04 initial Existing Pipeline | Implemented in 0.3.28 | Cross-channel expansion is IB-17 |
| 1 | IB-18 save recovery and conflicts | Core built/tested for 0.3.29 | Save receipts, local recovery, ambiguous commits, concurrent edits, measured latency |
| 2 | IB-19 submit completion | Built/tested for 0.3.29 | Confirmed success returns to Create; failures preserve editor |
| 3 | IB-11 consistent spacing | Shared spacing built/tested for 0.3.29 | Desktop/mobile visual acceptance |
| 4 | IB-17 cross-channel source reuse | Core built/tested for 0.3.29 | Shared source concepts, target-specific drafts/rules and access |
| 5 | IB-13 allowance/cost clarity | Wording/breakdown built for 0.3.29 | Wording/breakdown first; estimate/authorization changes require separate verification |
| 6 | IB-05 broader web research | Retrieval foundation built/tested for 0.3.30 | Qualified discovery/retrieval with provenance |
| 7 | IB-06 research instructions/preferences | Resource storage/preferences built for 0.3.30; freeform planner integration pending | Versioned editable/uploadable rules, sector-first coverage |
| 8 | IB-14 source diversity, no Wikipedia | New retrieval/evidence filters built for 0.3.30; complete legacy dispatch audit pending | Enforce exclusion in new search/retrieval/reuse paths; preserve historical records |
| 9 | IB-15 deep investigation and reliable jobs | Pending | Evidence ledger, analysis, dossier, bounded recovery; no invented verification |
| 10 | IB-07 Humanizer management | Resource upload/version/context integration built for 0.3.30 | Implement upload/version/use; actual Ryan file/link required for live acceptance |
| 11 | IB-16 Blog and format selector | Core format selector/contracts built for 0.3.29 | 4–10min Blog; 8–15min Newsletter; distinct structures; no paid rewrite on selection |
| 12 | IB-02 newsletter structure/export templates | Resource/context and supported JSON export layout built for 0.3.30; full template/image flow pending | Upload/edit/select/download, section/image slots and formatted exports |
| 13 | IB-08 multi-source newsletter | Composer/snapshots/outline and source-aware writing built for 0.3.32 | Posts/ideas/briefs/text/PDF/DOCX source basket with provenance |
| 14 | IB-01 image generation | Main/slide image workflow built for 0.3.31; section placement and live acceptance pending | User chooses OpenAI; secure one connection for post/Blog/Newsletter; qualified model/rate/key needed |
| 15 | IB-20 AI corrections and re-review | Opt-in bounded loop built/tested for 0.3.33; live quality acceptance pending | Bounded corrections, genuine founder questions only, current revision report and final human approval |
| 16 | IB-21 Reviews/history layout | History/preview built for 0.3.29; AI queue integration pending | Two sections; latest10 publications; 1/2/3/6/12months; exact snapshot popup |
| 17 | IB-09 LinkedIn OAuth/prepare-only | Pending | Developer app/credentials/access/capability verification; no fabricated native drafts |
| 18 | IB-10 approved scheduled publishing | Pending | Exact version/account/timezone approval, receipts, cancellation and uncertain-outcome reconciliation |

Target two-person flow: Writer submits → AI prepares/checks/corrects → ready for founder → founder minimal edits/final approval. System failures are not content findings. Independent engineering/provider acceptance remains necessary; queued or implementing does not mean tested or deployed.

No API keys belong in chat or the repository. No paid provider call, external source outreach or operational publication is authorized merely by this implementation order. The user's approved runtime allowances and final publication approval govern those actions.

Detailed scope and acceptance: IMPROVEMENT-BACKLOG-PLAN.md and DEEP-RESEARCH-BACKLOG-PLAN.md. Historical engineering/service validation: backlog-status.json and WORK-IN-PROGRESS.md; earlier deferrals are superseded only where the current user requirements explicitly change them.
