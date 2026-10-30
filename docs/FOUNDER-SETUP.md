# People access — administrators and founders

Current policy (explicitly requested by the user): both **administrator** and **founder** can manage every person and assign any Studio role, including founder to themselves or others. Founder includes all Studio permissions. There is no extra API key or server email setting required for role management.

## Give someone access

1. Open People & access.
2. On the person's row, select Edit access.
3. Select the desired role checkboxes. Founder, administrator, manager, editor, creator and viewer are available to both administrators and founders.
4. Save changes. Scoped grants remain available for narrower permissions where applicable.

An administrator can also select Set up founder access at the top of People & access and confirm their own founder role. This uses the same audited member update as the role editor, preserving other roles/grants. It does not change budgets, adopt a review policy, approve content or start AI work.

Managers, editors, creators and viewers cannot grant roles. An active administrator or founder must remain, and self-revocation is blocked. The API checks current verified sign-in and management authority; disabled/visible UI alone does not confer authority.

Protected policy actions still require the founder role. Administrators may grant that role through People & access. After doing so, Review and preparation settings become available in AI & budgets. Saving those settings remains a separate explicit action.

This replaces the earlier founder-only assignment and deployment-designated first-founder setup instructions. The legacy optional claim endpoint is retained for compatibility, but is not needed or shown in the current People workflow. Existing deployments do not need another environment variable or API key for this change.
