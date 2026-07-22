---
name: handoff
description: Use when ending a work session, when the user says "wrap up", "write the handoff", or /handoff, or when context is running low mid-task — captures session state in HANDOFF.md before it is lost.
---

# Session Handoff

Write `HANDOFF.md` at the repo root (overwrite the previous one) so the next person or agent — with zero memory of this session — can pick up exactly where it left off.

## Required sections, in this order

1. **The goal we are working toward** — the overall objective (often multi-session), not just today's task. State it explicitly even if it feels obvious.
2. **Current state of the code** — what is done/verified, exact unpushed-commit count (`git log --oneline origin/main..HEAD | wc -l`) with this session's SHAs listed, working-tree status, whether the dev server is running, any DB changes.
3. **Files actively edited this session** — path + one line on what changed in each.
4. **Everything tried that failed** — every dead end, wrong approach, and gotcha hit this session, each with why it failed and what replaced it. This is the section future sessions need most; never trim it to look tidy.
5. **The next step** — the single concrete first action for the next session, then remaining steps in order. Include decisions still waiting on the owner.

## Rules

- Every statement must be traceable to this session or verifiable now (git, files, running processes). Verify counts and SHAs with git before writing — do not write from memory, and do not invent details, names, or rationales that weren't observed. If unsure, write "unconfirmed".
- If a required item has nothing to report (no failures, no pending owner decisions), write "None this session" — never invent entries to fill a slot.
- Convert relative references to absolute (dates, SHAs, file paths).
- This repo: commit `HANDOFF.md` locally as `docs: session handoff notes`. **Never push** — see memory `no-push-without-approval`.
