<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## User-required checkpoint policy

- While actively working, create a local Git checkpoint and push it to the working branch at least every five minutes when there are changes. Also checkpoint before long operations, before handing off or ending a session, and when approaching context/usage limits.
- Save unfinished work as an explicitly labelled WIP commit on `studio-rebuild` or the current agreed development branch. Do not push incomplete work to `main` or trigger a production rollout just to make a backup.
- Never include credentials, local environment files, dependency/build caches, or unrelated user files. Inspect the staged file list and preserve existing changes; do not amend or rewrite history as a checkpoint shortcut.
- Verify the remote push succeeded. A local commit alone is not a remote backup. Report a blocked/failed push and preserve the local checkpoint.
- A WIP checkpoint does not assert tests passed or that the feature is complete. Record unfinished work and the next action in `docs/WORK-IN-PROGRESS.md` when handing off.
- This policy applies during active execution; do not claim background work or a save after a sudden interruption that was not actually completed.
