# First-founder setup and review policy

An existing Founder can assign or remove founder roles through People & access. Administrators cannot grant themselves founder authority, alter a founder's role, revoke a founder, or change protected policy. The last active founder is retained.

For an administrator-only workspace with no founder ever recorded:

1. The deployment owner sets the **server-only** `STUDIO_FOUNDER_EMAIL` to the intended founder's verified Studio sign-in email and redeploys the verified release. Do not use a `NEXT_PUBLIC_` variable. This setting is not an API key and is never taken from a browser request.
2. That existing administrator signs in at `/studio`, opens AI & budgets, and selects **Check founder setup**. The server validates the Supabase session and confirmed email.
3. They explicitly accept founder responsibility and select **Confirm founder role**. This records the actor ID, email, timestamp and audit event atomically. It does not change budgets, enable automation, approve content, or call a provider.
4. They can then open **Set up two-step review**. The suggested limits are $0.50 per package and $5 monthly. Saving is a separate founder decision. Existing package/request/global limits still apply; provider connections, qualified pricing, a package authorization and the running worker are required for paid work.

The first-founder claim is unavailable if any founder record exists, including a revoked founder or a previous setup record. It cannot be used to replace an owner or recover a locked account; deployment-owner recovery must be handled separately. Repeated successful claims by the same authenticated principal are idempotent. Stale workspace versions reject rather than overwrite changes. No settings or privileges change on page load.

The review policy is versioned and remains legacy until explicitly adopted. The form holds the original policy/rule/budget values while editing, rejects stale saves, and the server independently blocks policy changes while jobs are waiting, queued, running or uncertain. Automatic textual review is an explicit option. Notes still require founder authorization and the required independent report. Initial automatic writing is not enabled by this setup; use the saved draft's Write with AI control until that separate orchestration is completed.

Validation uses isolated domain and browser fixtures. No live founder claim, environment change, policy adoption or paid provider request was performed during implementation. The deployment owner still needs to configure and accept this setup after release.
