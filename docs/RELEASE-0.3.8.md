# v0.3.8 — Simplified Claude ideas, writing and review

In **AI & budgets → Bounded research and writing**, select a stored Claude Sonnet 5.5 Text connection and choose **Check model and enable bounded workflow**. The server checks the model's input/output bounds using the stored key, then registers tool-free Ideas/Text/Review roles and workspace defaults. No native web-search capability, extra Research key, guessed reservation or paid generation is required for setup.

Prices use the user's supplied October 30 documentation ($2/M input, $10/M output tokens). Calls are bounded to 65,536 input bytes including quote allowance and 2,048 output tokens, at most 16 cents rounded up. Setup enables a minimum 16-cent connection allowance; founder monthly/per-request/package limits and explicit channel overrides stay in place. Those overrides can still require their own validation and pricing. Shared Claude review is a second pass, not independent review; existing independent-provider requirements are unchanged. Editing a connection clears its role/capability qualification.

The v0.3.7 public-reference selection already feeds frozen evidence to idea and writing prompts. Next builds add sample verification, followed by detailed cost reporting. No live paid sample is asserted by this release.

Local verification: production build/typecheck passed; all 212 domain tests passed; full browser regression and retained-evidence workflow browser checks passed; new bounded-setup browser test passed with local setup responses. No live Claude/search call was made by these checks.
