# RyzaLab Content Studio

A Next.js Campaign Command Center for an invited team. Seven workspaces: YouTube, LinkedIn, Instagram, TikTok, Facebook, Hub, and Reddit. Includes Claude-generated content packs, editable drafts, a shared campaign brief, local brand wording checks, two carousel templates, PNG ZIP / PDF exports, and OpenAI concept images.

## Run in VS Code

Requires Node.js 22+ and npm. Open this folder in VS Code, then:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3005 in your browser. Without Supabase credentials, the app opens a **labelled local demo**, with sample drafts stored in this browser. Demo mode cannot call paid APIs, invite users, or impersonate a real member. Edit sample drafts and test carousel exports, or create your own text manually. No production data is seeded.

## Enable invite-only email/password login and team storage

1. Create a Supabase project. Run `supabase/schema.sql` in its SQL editor (skip this if already applied).
2. In Authentication > Sign In / Providers, enable Email and **disable new user signups**. OTP and custom SMTP are not needed by this version. There is no public signup form or password-reset email flow.
3. Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and **server-only** `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Existing API keys remain the same. Use `http://localhost:3005` for your local Site URL.
4. From the VS Code terminal, run `npm run account:password -- your-email@example.com`. Enter and confirm a unique 12–128 character password when prompted (input is hidden). The command creates the auth account if missing, or sets a new password for an existing OTP account. It confirms the email as an administrator action and sends no email. It does not grant membership or change roles. Only trusted administrators with the service-role key should run it.
5. In the Supabase SQL editor, grant the first admin membership, using your actual lower-case email:

   ```sql
   insert into public.members(email, role)
   values ('your-email@example.com', 'admin')
   on conflict (email) do update set role = 'admin', revoked_at = null;
   ```

6. Restart `npm run dev`, then sign in with your email and password. No email code is required.
7. On Members, add a colleague using their email and an initial 12–128 character password. Share the initial password through a private channel. No invitation email is sent. Members can change their own passwords on the Members page. Account creation is restricted to workspace admins and marks the email confirmed; administrators are responsible for verifying the member’s identity.
8. If a member forgets their password, a trusted administrator runs the same `account:password` command locally. For pre-existing Supabase accounts not yet in the member list, set their password with that helper, then add their lower-case email to `public.members` with role `member` in the SQL editor. Never put passwords in SQL, command arguments, chat, or repository files.

Membership is checked by row-level security and every paid/API operation. Revoking a member immediately blocks further database and AI access even if their auth session remains valid. Removing membership cannot erase content already downloaded by that person. Admin-to-admin changes and restoring revoked memberships are managed in Supabase. All members collaborate on drafts and the current brief. The interface currently loads the latest campaign by week; campaign archives and multi-campaign switching are not implemented.

## AI providers

- Set `ANTHROPIC_API_KEY`. Default model is `claude-sonnet-4-6`; override `ANTHROPIC_MODEL` if needed for your account. Content generation loads your uploaded markdown reference files from `knowledge/`, including the brand brain and selected channel playbook. User briefs are treated as source material, not system instructions.
- Set `IMAGE_API_KEY` for images. Default `OPENAI_IMAGE_MODEL=gpt-image-1`. Your OpenAI account must have access/billing for that model; provider verification may be required. Image generation is a separate provider from Claude. Cost controls: 30 text requests and 8 image requests per user/hour, enforced atomically in Supabase. Failed provider calls also consume quota. Configure additional spend limits with each provider.
- API keys are read only by server routes. Never prefix them with `NEXT_PUBLIC_`, commit `.env.local`, or put them in browser settings. `.env.example` contains names only.
- Generated images are **session-only** and must be downloaded before leaving the workspace. They are not uploaded to storage or persisted with drafts. Carousels export at 1080 × 1350; images are original 1024 × 1024 PNG. Image concepts and exports carry synthetic-image disclosure. No finished video generation or direct social publishing.

## Brand review and exports

The supplied knowledge is product reference material. `lib/brand.ts` adapts supplied regex rules to JavaScript, including audience filtering, sentence-level exceptions, medical disclaimer reminders, pending price checks, and placeholders. This is a wording check; it does not verify factual truth, source currency, consent, or implied claims. Claude also receives the source guardrails. Only Ryan can approve publication; “Send to Ryan” saves a review status and does not send email or publish. There is no automatic approval state. Exports remain available for revisions and require human review before use.

The visual identity supplied was provisional. The wordmark in the app is a text placeholder, not an approved logo asset. Replace it with the real logo when available. Inter and Manrope are served locally from font packages. The reference materials include draft campaign plans and pending offers; those are not represented as approved campaign decisions.

## Validate

```sh
npm run test
npm run typecheck
npm run build
# Optional real browser checks, against a running demo server:
npx playwright install chromium
npm run test:browser
```

For a credentialed acceptance test: create a second member, verify their email/password login and password change, save a brief, generate a LinkedIn pack, edit/save/reload the draft, generate an image and export a carousel as PNG ZIP/PDF. Revoke that member and confirm further API/database access is denied. Verify a non-member and missing-token requests cannot generate content. Real password authentication, account administration, provider calls, and cross-user RLS require your project credentials; local demo tests do not validate those services.

## GitHub and Vercel

Commit these files and push to your repository when ready. Import the repository into Vercel as Next.js. Add the environment variables from `.env.example` in Vercel settings, apply the Supabase schema, and configure the final Site URL. Redeploy after changing public environment variables (they are baked into the client build). Routes request 120-second text / 180-second image execution; choose a hosting plan that supports these durations. Do not share a production deployment in demo configuration if it should be a private workspace. Demo contains only bundled samples and does not grant API access.

Publishing this repository or deploying to Vercel has not been performed by the app. API keys and infrastructure are your own. No secret values are included.

Local development and production start commands use port **3005**. For Supabase local testing, set Site URL and the allowed redirect URL to `http://localhost:3005`.
