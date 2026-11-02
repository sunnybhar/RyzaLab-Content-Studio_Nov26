# v0.3.7 — Bounded public research

This build adds **Web research → Find public references** to Ideas and Create. It retrieves Wikipedia introductory extracts and Crossref scholarly abstracts from exactly two fixed public API hosts, with no redirects/retries, 12-second timeout per request, 64 KiB response limit per source, and at most six excerpts/12 KB excerpt text. Title-only results are excluded. Missing coverage is shown explicitly.

No paid search/model endpoint is called by retrieval; hosting/network charges are separate. Retrieved evidence can use the existing selection and frozen-source path into idea/writing generation. Claims remain subject to human source review. This is not unrestricted news/web search and does not verify personal experience.

The header version and **What’s new** dialog identify the deployed build. A separate Claude Research connection is unnecessary for this retrieval route. Existing Claude idea/writing setup and all budget controls remain as before; simplified setup arrives in the next build. No detailed usage display or sample dashboard is included here.

Validation: see the latest checkpoint in WORK-IN-PROGRESS.md. Live source connectivity and paid Claude samples require verification from the live deployment; local fixtures do not prove live success.

Completed local validation: production build and TypeScript passed; 210/210 domain tests passed; full browser regression passed; retained-evidence idea/writing/review browser flow passed; bounded-source UI/build-notes browser test passed using local fixtures. No live search or paid model acceptance is inferred from these checks.
