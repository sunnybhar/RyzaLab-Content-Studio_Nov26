# Research setup —0.3.6

The old manual Research pricing form has been replaced. Do not fill a guessed Fixed conservative reservation or tick a qualification checkbox.

1. In live AI & budgets, add/select a stored Claude Research connection. Enter keys only in Studio.
2. In Review and preparation, the founder chooses a named package category or custom$0.50–$2.00 cap and their own monthly limit. No monthly default is imposed when unset. Save only changes you intend.
3. In Research setup, select the connection, preview category and response size, then Check capability & calculate. This reads the Models API; it does not generate content or perform paid search.
4. Inspect supported/unknown status, model token bounds and the calculated envelope. Prices are dated to the user's Oct30 documentation; source links are shown.
5. If the calculation fits all current limits and the saved policy matches the chosen cap, Save calculated research setup records the rate and connection allowance after rechecking capability. Neither policy nor monthly budget changes there.
6. If it does not fit, setup remains blocked. Do not increase the price field or verification checkbox to bypass the result. There is no manual Research price field in this version.

Important: native Sonnet5.5 basic search with the documented1M context lacks a tight retrieved-input cap. The new deliberately conservative envelope exceeds$2, so this release does not make that configuration usable under$2. See RELEASE-0.3.6.md. To meet the requested hard ceiling, a bounded/fixed-cost public retrieval step followed by an ordinary token-bounded Claude writing call, or a provider-enforced per-request billing ceiling, must be evaluated next. No alternative provider or credentials have been selected/activated.

Existing cited results remain retained evidence for ideas, writing and review. Legacy guessed search reservations cannot authorize new paid execution. Live paid sample tests remain Not run.
