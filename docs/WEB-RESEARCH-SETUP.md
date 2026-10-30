# Web research setup and use

This release connects the existing bounded Claude server-search adapter to Ideas and Write. It does not automatically activate search in an account or verify current prices/tool support. Model access alone does not establish web-search capability. Current official docs could not be retrieved from this build environment (network CONNECT403); no current price or model support was guessed.

## One-time setup in live Studio

1. AI & budgets → Set up research. Select Claude/Anthropic and a model that your account supports with `web_search_20250305`. Enter your provider credential in Studio, never chat. Save and Check model access. Research uses the provider API, separate from the Claude chat website subscription.
2. On that validated research connection choose **Use as Research default**. This applies when the active channel has no Research override. An explicit channel Research connection continues to take precedence; change it through Workflow settings → channel → Edit connections → Research, and review/activate that change.
3. Verified pricing → Load pricing → Add pricing. Choose research and the exact provider/model. Record current documented token rates and adapter limits, the HTTPS pricing source/date and qualification evidence. Research currently accepts Claude, one bounded search, and a fixed conservative reservation covering all input/output tokens, retrieved-source context and server-tool charges. Record evaluated account/model/tool support in the evidence. This is an administrator qualification, not an automatic claim of a successful live test.
4. Edit allowance on the connection must cover that verified reservation. Monthly, channel, function and request limits still apply. In Create, authorize the draft's total package allowance before research; search, writing and review consume the same package cap. Nothing in this release changes the existing live limits. If qualified search cannot fit, adjust scope or explicitly approve a justified exception; do not guess a smaller cost.

## Ideas

Open Web research → Search the web. Enter an explicit public question, excluding private details. Choose Research the web; actual queue/running/confirmation/uncertain status is shown. Open the findings and original sources; inspect publication dates and contradictory evidence. Select Use this evidence in idea generation. Generate ideas opens the existing brief form with that completed result selected. Generation does not start another search.

## Create

Inside Write → Web research, run a public query or select existing usable research from the same channel. Select Use this evidence in writing, then Write/Revise with AI. The server includes the retained summary, exact citations/excerpts, retrieval date when available and provider finding-to-source links in the draft request. Selecting an AI-generated researched idea carries its evidence into the linked draft. Review generation also receives the retained evidence.

Search only receives the explicit query. Private draft text, workflow instructions and internal references are not automatically sent as search context. A separate writing call continues to receive its normal authorized drafting context.

Failed/incomplete/uncited/tool-error/unknown results cannot be selected as cited evidence. There is no automatic paid retry. Changed evidence or source access blocks queued disclosure and prevents a returning result from overwriting a draft/report. Human approval remains required, especially for personal experiences or claims that retrieved pages cannot establish.

## Acceptance evidence

See ACCEPTANCE-SAMPLES-0.3.5.md. Local mock tests cover the complete contract, budget and workflow paths. Live research and paid AI samples have not been run in this environment; they require the live workspace's qualified connection, pricing and app authorization.
