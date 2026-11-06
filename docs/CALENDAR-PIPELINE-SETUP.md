# Calendar import and Existing Pipeline — v0.3.28

This release implements Build 1 (IB-03/IB-04). It does not add image providers, newsletter template/multi-source assembly, new research adapters or automatic publishing. Those remain in the master backlog. Existing live writing/review behavior is retained.

## Use it

1. Save current editor changes before refreshing to v0.3.28.
2. Open **Calendar → Upload content calendar / download template**.
3. Download the XLSX template, or choose your existing XLSX (5 MB maximum).
4. Select the worksheet and its header row. Check the suggested column mapping, timezone and destinations. Import worksheets one at a time, including Content Ideas/Existing Pipeline for unscheduled work.
5. Click **Preview import**. Review row-level errors and warnings. Empty title rows, formatted-only rows and formulas are ignored. Invalid rows cannot be imported.
6. Combined Website + LinkedIn rows are not selected by default: explicitly include them to import only their LinkedIn brief, preserving the original destination in notes. Website-only/unknown destinations must be explicitly remapped or skipped. Retired channels are never restored.
7. Duplicates default to skip. To update an existing brief, choose Update brief only. Updates require its current preview version and are blocked once content links to the brief. Previous five brief versions and the latest 100 import summaries are retained. No draft, approval or publication is overwritten.
8. Confirm the selected rows. Dates appear in Calendar; all briefs appear in **Existing Pipeline** in both **Ideas** and **Create**. Date-only rows have no publishing time; missing dates remain unscheduled. Historical published rows remain historical planning/reference records.
9. Search/select a brief and choose **Generate ideas from brief**, **Add idea manually**, or **Write directly**. Choose LinkedIn or Newsletter as needed. Direct writing opens an editable draft and preserves supplied existing copy. It does not run AI. Use the existing Write with AI flow explicitly when ready; normal budget/rules checks apply.
10. Expand the pipeline origin below the writing controls to inspect the frozen brief version, source filename/sheet/row, angle, links and planned time.

## Date and duplicate rules

Use YYYY-MM-DD, an Excel date, or explicit MM/DD/YYYY. Use HH:MM, an Excel time fraction, or HH:MM AM/PM. Timezone must be an IANA name, e.g. America/New_York; the workspace timezone is the default. Missing dates are never guessed. DST folds/gaps are flagged rather than choosing an ambiguous instant. Calendar shows the imported planned local date; the label preserves its timezone. Planned times are not authorizations to publish.

Keep a stable Brief ID to recognise a brief across renamed/reordered workbooks. Without an ID, identity is the filename + worksheet + original row + channel. Moving rows or renaming a file without IDs can create new briefs; review them first. Matching by title alone would risk merging unrelated work and is intentionally avoided.

## Storage and access

Pipeline/import collections are optional fields in the existing versioned workspace JSON. No new database migration is required. Imports use the existing authenticated command endpoint, permissions and atomic compare-and-swap save. Concurrent changes reject safely; refresh and review again. There are no automatic retries or provider calls. The original workbook is parsed locally, not stored on the server; its filename/row provenance, normalized imported text and labelled notes are saved. Downloadable original ZIPs in Agent Rules remain a separate existing capability.

## Verification

Domain checks cover atomic import, stable-ID deduplication/replay, protected/versioned updates, direct drafts, inherited idea provenance, scoped access, date systems/DST and unsupported destinations. Browser checks cover template download/XLSX parsing, preview, actual date placement, both entry screens, draft copy/provenance, persistence after reload, duplicate protection and mobile. The supplied workbook is used only for local parsing compatibility; it is never imported into production or checked into the repository.
