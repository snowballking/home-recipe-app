# TECH DEBT — Chef HideOut 私厨

Known code-quality debt that is **not blocking any feature**, recorded so it can be
cleared opportunistically while working on the surrounding code rather than as a
separate risky refactor.

Rule of thumb: when you open one of the files below for feature work, clear its
entries in the same pass. Don't do a big-bang cleanup PR.

---

## 1. Lint errors blocking `npm run verify` (46 errors)

**Recorded:** 2026-08-03
**Status:** open — `npm run verify` and CI both go red at the lint step until this clears.

### Background

Lint was configured but nothing enforced it, so errors accumulated silently. Adding
CI + `npm run verify` surfaced them all at once. **None of these are new** and none
are known to cause a user-facing bug — the app builds, all 48 unit tests pass, and
the end-to-end smoke tests pass.

### Breakdown

| Count | Rule | Risk to fix | Notes |
|---|---|---|---|
| 40 | `@typescript-eslint/no-explicit-any` | **Low** — type-only, cannot change runtime behaviour | Needs real Supabase row types written out |
| 3 | `react-hooks/set-state-in-effect` | **Medium** — changes runtime behaviour | Test in dev before deploying |
| 2 | `prefer-const` | **Trivial** | `eslint --fix` handles these |
| 1 | `react-hooks/immutability` | **Medium** — needs inspection | |

Two files hold two-thirds of the total.

### Full list

**`app/dashboard/plans/[id]/page.tsx` — 20**
`no-explicit-any` at 193:39, 282:21, 283:22, 314:35, 333:54, 338:34, 413:19, 456:19,
614:19, 665:19, 700:19, 774:19, 798:19, 806:34, 819:56, 823:38, 824:39, 1497:109, 1694:105
· `react-hooks/immutability` at 354:13

**`app/api/approval-plans/route.ts` — 11**
`no-explicit-any` at 58:57, 65:34, 69:45, 76:26, 77:25, 78:29, 94:69, 101:44, 106:57
· `prefer-const` at 78:7, 95:9

**`app/api/approval-plans/[id]/route.ts` — 2** — `no-explicit-any` at 23:38, 149:36
**`app/api/grocery-ai/route.ts` — 2** — `no-explicit-any` at 104:40, 112:17
**`app/dashboard/plans/[id]/grocery/page.tsx` — 2** — `no-explicit-any` at 320:48, 370:21
**`app/dashboard/recipes/new/page.tsx` — 2** — `no-explicit-any` at 305:28, 1002:33
**`app/dashboard/plans/page.tsx` — 1** — `no-explicit-any` at 87:65
**`app/dashboard/recipes/[id]/edit/page.tsx` — 1** — `no-explicit-any` at 401:33
**`app/plan/[id]/page.tsx` — 1** — `no-explicit-any` at 87:46
**`app/recipe/[id]/estimate-nutrition-button.tsx` — 1** — `no-explicit-any` at 53:19
**`app/dashboard/plans/new/page.tsx` — 1** — `set-state-in-effect` at 43:29
**`app/page.tsx` — 1** — `set-state-in-effect` at 20:19
**`lib/i18n/language-context.tsx` — 1** — `set-state-in-effect` at 27:7

### Suggested order

1. **`prefer-const` (2)** — run `npx eslint --fix app/api/approval-plans/route.ts`. Zero risk.
2. **`no-explicit-any` in the API routes (15)** — do this alongside backend work. These
   are Supabase query results; defining the row types once benefits the whole file.
3. **`no-explicit-any` in the meal-plan pages (25)** — largest chunk, mostly in one file.
   Best done when that page is next touched for a feature.
4. **The 3 hook effects + 1 immutability (4)** — leave for last. These change behaviour.
   `lib/i18n/language-context.tsx` is the language switcher, so a regression here is
   visible on every page and in both languages. Test in dev, in Chinese, before deploying.

### Also present (not blocking)

38 warnings, which do **not** fail the build: 17 `no-img-element` (would want
`next/image` for LCP/bandwidth), 12 `react-hooks/exhaustive-deps`, 8 `no-unused-vars`,
1 `no-unused-expressions`. Worth a look during the Phase 1 hardening pass.

---

## How to check current state

```bash
npm run lint                 # full report
npm run verify               # the whole chain: typecheck → lint → test → build → e2e
```
