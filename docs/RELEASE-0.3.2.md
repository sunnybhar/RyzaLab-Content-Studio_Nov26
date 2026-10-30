# Studio 0.3.2 — People role administration

The user explicitly requested that administrators and founders both manage all people and assign any role. This replaces the previous founder-only role-assignment rule and eliminates the first-founder environment-setting prerequisite from the normal People workflow.

- Both profiles can grant founder, administrator, manager, editor, creator or viewer to themselves and others, edit another founder's roles and revoke another member.
- Edit access uses role checkboxes with founder's full-access meaning shown beside the option.
- Administrators can also select Set up founder access and explicitly confirm their own founder role in People & access. No extra API key or server email setting is required.
- AI & budgets links administrators to People for founder access instead of asking for deployment configuration. Protected-policy actions remain founder-role actions; an administrator may grant that role through People.
- Verified sign-in, audited member updates, lower-role denial, self-revocation blocking and retention of at least one active administrator-or-founder remain enforced server-side. A role update does not change budgets, adopt review policy or start AI generation.
- The unused legacy designated-owner claim endpoint remains for older clients; it is not the current setup path.

Validation:175 automated checks, TypeScript/production build, isolated People browser flow covering admin editing an existing founder and self-assigning founder/all roles, and parsed training artifacts. Full production browser regression result is recorded in WORK-IN-PROGRESS. No live account roles or budgets were changed during development. Training remains14modules/172manualcases/62backlogitems with manual statuses Not run.
