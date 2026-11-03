# v0.3.15 source discovery

Ideas and Create now attempt general web/news discovery through fixed Bing RSS endpoints alongside Wikipedia and Crossref. Up to four bounded requests yield at most six source excerpts, 12 KB total excerpt text. Each saved result identifies its source kind and original website link. Search availability is not guaranteed; failures and partial coverage remain visible. This is search-excerpt evidence, not a full-page read, comprehensive news coverage or independent factual verification. The server never fetches search-result URLs. No paid search API call is made by this adapter; hosting/network costs are separate. Claude synthesis remains charged within existing limits.

The workspace network proxy currently blocks live endpoint checks with CONNECT403. Fixture tests verify handling and provenance; hosted retrieval and the five live Claude samples are not verified here. Native paid Claude search setup remains a separate option.

Older setup notes follow for historical context:

# Integrated research — v0.3.13

## Generate AI ideas

Open Ideas → Generate with agent. Enter the public topic, audience and quantity, then Generate ideas. Research runs automatically before the configured idea model; source websites and excerpts appear in the same window with the ideas. Confirm an allowance inline if required by current settings. No separate research run or evidence dropdown is required. A failed/no-source retrieval stops before paid generation; it does not invent verification.

## Enter a manual idea

Open Ideas → Add manually. Enter your title and angle. Save directly to keep it fully manual, or use Research and develop this idea in that window. The agent's proposal and original source links/excerpts appear there. Your entered text stays unchanged until Use this AI development in my idea. Add idea saves it with its evidence; Save idea and open writing carries the research into Create. If automatic drafting is enabled, using the idea starts its initial draft within the existing post allowance; otherwise use the editor's Write with AI button explicitly.

Research sends the entered topic/title only to public reference providers. Private angle/source notes are not appended to public queries. Coverage is Wikipedia introductory extracts and Crossref scholarly abstracts; not unrestricted news/web or private-experience verification. Inspect sources and required missing-fact markers before human review.

Existing validated model connections, qualified pricing, all permission/monthly/request/post limits and two human approvals remain in force. Source retrieval uses no paid model/search endpoint; the configured idea/writing call does use the model budget.

Agent Rules is independent storage only. Neither Instructions/Context uploads nor voice examples are linked to these agents yet.
