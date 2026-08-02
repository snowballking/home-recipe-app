@AGENTS.md

# Project context

- Before building any feature, read FEATURES.md — the build source of truth (what each feature is and how to build it, tagged by phase and status).
- ROADMAP.md is the business overview & progress checklist (phases, not weeks; product items point to FEATURES.md) — read it for what to work on next and where it sits.
- Historical build context (architecture decisions, known gotchas like the Vercel env-var issue with new API route files) is in SESSION_SUMMARY.md.
- Owner is a non-technical founder: explain changes in plain English, run typecheck before declaring work done, and always confirm the build passes before pushing to main (pushes auto-deploy to production via Vercel).
