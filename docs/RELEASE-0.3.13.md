# v0.3.13 — Integrated idea research and stored-only Agent Rules

**Ideas:** Generate with agent retrieves bounded public references automatically, then generates the requested cards with retained source URLs/excerpts in the same window. There is no separate evidence-selection prerequisite. Add manually includes Research and develop this idea; it keeps the original entered text until the user explicitly applies the AI proposal. Manual assistance is not automatically imported as an extra agent idea. Saved research follows the original idea into writing, with ordinary existing draft generation/review behavior. Request replays reuse saved jobs; source failure never silently falls back to unsupported AI claims. Current source coverage remains Wikipedia introductory extracts and Crossref abstracts, not unrestricted news/web search.

**Agent Rules:** New Manage section stores separate Instructions and Context original files per channel. The RyzaLab tone and original content voice library accepts multiple labelled article/post/newsletter examples, pasted text or DOCX/PDF/TXT/Markdown files, brand-wide or channel-specific. Files are preserved for download, with remove/replace controls. These files and voice examples are independent storage and are **not parsed, executed, added to workflow references or sent to current agents**. Linking remains future work, as requested. The user's personal reference DOCX was inspected for headings only and was not automatically installed as RyzaLab guidance.

Storage limits: 256 KB per original file, 60,000 characters per pasted example, 100 voice examples within the existing workspace limit. Channel permissions and stale replacement guards apply. No new paid calls are triggered by Agent Rules uploads.

Queued only: the saved LinkedIn/Newsletter setup checkbox's checked/disabled behavior was not changed. User explicitly deferred that issue.

Validation in progress. Local model/source fixtures are not live acceptance calls.

Verified locally: production build/typecheck and all 231 domain tests passed. Full browser regression, automatic AI/manual idea research window, retained evidence into writing/review, original Instructions/Context upload/download, pasted/file voice library and reload persistence checks passed. Original pasted text retains boundary whitespace/line structure; files retain exact bytes. No real paid generation or live Agent Rules uploads were performed by the coding agent. Hosted rollout remains separately verifiable through the visible version.
