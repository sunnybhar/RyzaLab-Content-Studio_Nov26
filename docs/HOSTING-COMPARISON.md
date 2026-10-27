# Hosting evaluation — selection remains open

This is a workload comparison, not a current vendor-price quote. User asked to compare alternatives before selecting. No migration or production deployment was performed.

| Option | Web/API | Jobs and media | Strengths | Tradeoffs |
|---|---|---|---|---|
| Preserve Vercel + Supabase, add managed worker | Existing Next.js deployment | Persistent Render/Fly/Railway-type container with FFmpeg | Lowest web migration effort; separates long work | Two deployment surfaces; function limits and cross-service recovery; choose worker plan after sample |
| Container-hosted Next.js + worker, preserve Supabase | Managed container host | Dedicated worker/container | Common runtime and FFmpeg available; predictable long-job execution | More runtime administration, health checks, scaling and rollout work |
| Single managed VM + Supabase | Reverse proxy + Next.js process | Separate worker process on VM | Direct filesystem/render control; simple small-team topology | OS patching, backups, process supervision and capacity planning become owner responsibilities |

All require private asset storage, encrypted credentials and backups. Video rendering is CPU/memory intensive and must not run inside a short HTTP function. Signed direct uploads avoid sending large video files through a serverless request body limit. Browser APIs reference immutable private asset IDs. Generated video provider choice, request costs and quality remain evaluation gates.

Recommended evaluation: use a 90-second source project, run three aspect renders, measure CPU/wall time/memory/storage and interruption recovery, then compare actual provider quotes. The real local renderer is implemented and tested; choosing a paid worker or testing a paid AI video provider still needs a specific allowance. Do not infer that a UI or successful local export proves a hosted worker is deployed.

Runtime model selection in Studio is unrelated to development routing. GPT-6.1 Sol handles routine implementation and screenshot corrections; GPT-6 Astra reviews state/authorization/approval reliability before implementation and before release.
