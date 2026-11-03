# Agent Rules — connected to new requests

Open Manage → Agent Rules and select a channel. LinkedIn has separate **Instructions** and **Markdown context (.md)** upload slots. Each slot has a downloadable Markdown template; edit and upload it separately. Other channels retain Instructions and Context slots. Original files remain downloadable, replaceable and removable.

New ideas, writing and review jobs freeze that channel's extracted Instructions and Context. Instructions guide the task beneath protected policy and the output contract. Context is reference material, never verified facts or permission to invent personal experiences. Existing jobs keep their original context; changing a file does not rewrite an active job.

RyzaLab tone and original content voice accepts multiple pasted articles/posts/newsletters or file examples, shared or channel-specific. Each new job uses up to six newest matching examples with up to 2,000 characters each. This selects a bounded set of examples, not the entire archive. Rules are included without silent truncation; normal input and package limits still apply and oversized requests are blocked before spending.

Server uploads extract Markdown/TXT, DOCX and searchable PDF text. Existing uploaded files are extracted when a new idea/writing/use-idea request is submitted. Scanned PDFs require OCR; empty documents fail with an actionable message. Originals remain unchanged. Limits: 256 KB per file, 20 PDF pages, 60,000 extracted characters, 100 voice examples. No upload starts a paid model request.

Private rules and examples are never used to construct public search queries. Only the entered public topic and audience form the automatic idea-research query. Untrusted source content cannot override protected policy, call tools or authorize approval/publication.

## v0.3.16 — user-managed ZIPs, skills and knowledge

Choose LinkedIn, then upload RyzaLab-LinkedIn.zip in Upload or edit a channel package. For newsletter writing choose Newsletter and upload RyzaLab-Hub.zip. The attached sample files are never installed automatically. The preview separates INSTRUCTIONS.md from the knowledge/*.md documents; edit both fields, inspect skipped files and click Save package. Saving both slots is atomic and rejects stale replacements. Cancel leaves saved content unchanged.

Under Instructions, add skill guidance Markdown/text files or a skill ZIP containing SKILL.md and references/*.md. Under Context, add knowledge Markdown/text files. These additions open the editable preview; they are not saved until you click Save package. Scripts, setup guides and nested archives are listed as skipped and never executed. A skill that asks for a Python tool does not create or run such a tool in this writing adapter.

Edit saved Instructions and context lets users revise the text later. Download saved package ZIP exports the edited Instructions and combined context as a reusable Markdown package; skipped code and original setup artifacts are not included. Individual saved Markdown files remain downloadable as well.

ZIP limits: 1 MB compressed and expanded, 64 entries, 256 KB per expanded file. Instructions and combined context each allow 60,000 characters. Large context is locally selected into source-labelled sections (up to 12,000 characters per request); full originals remain editable. Selected excerpts and Instructions are frozen into each job, counted in its input allowance, and never sent to public search endpoints.
