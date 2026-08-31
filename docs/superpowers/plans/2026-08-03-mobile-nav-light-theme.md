# Mobile Navigation and Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the approved mobile bottom-panel proportions and keep the app on its warm light palette regardless of the device color-scheme preference.

**Architecture:** Preserve the existing five-column mobile navigation and desktop header. Add an icon-only variant to `CreateMenu` for the mobile center action, keep the existing 24px/12px nav icon-label sizing, and make Tailwind dark variants class-controlled so the un-themed app does not switch to black automatically.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, Vitest, Testing Library.

## Global Constraints

- Apply visual changes only below the mobile breakpoint; desktop header/navigation stays unchanged.
- Use 24px icons and 12px labels in English and Chinese.
- Keep Create accessible with its translated `Create`/`创建` name while showing only a compact plus button on mobile.
- Keep the warm light palette as the default; do not let `prefers-color-scheme: dark` override it.

---

### Task 1: Lock the mobile navigation and theme contracts with failing tests

**Files:**
- Modify: `tests/nav-bar.test.tsx`
- Create: `tests/light-theme.test.ts`

- [x] **Step 1: Add a failing mobile Create-size assertion**

Extend the mobile navigation test to assert that the Create button has `h-10`, `w-10`, and no visible `Create` text while retaining the accessible button name.

- [x] **Step 2: Add a failing light-theme contract test**

Read `app/globals.css` and assert it contains a class-controlled dark variant declaration and does not contain a `prefers-color-scheme: dark` media override.

- [x] **Step 3: Run the focused tests and verify the expected failures**

Run:

```bash
npm test -- tests/nav-bar.test.tsx tests/light-theme.test.ts
```

Expected: the current Create button sizing/text and current system-dark media override fail.

### Task 2: Implement the approved mobile nav and light-theme behavior

**Files:**
- Modify: `app/components/create-menu.tsx`
- Modify: `app/components/nav-bar.tsx`
- Modify: `app/globals.css`

- [x] **Step 1: Add `CreateMenu`'s icon-only variant**

Add an `iconOnly` prop. When true, render a 40px by 40px plus-only button with the translated accessible label; keep the existing desktop button markup and styling when false.

- [x] **Step 2: Enable the variant only in the mobile bottom panel**

Pass `iconOnly` from the mobile Create slot and remove the old mobile padding/min-height overrides. Leave the desktop `CreateMenu` call unchanged.

- [x] **Step 3: Prevent automatic dark-mode replacement**

Declare Tailwind's `dark` variant against an explicit `.dark` ancestor and remove the `prefers-color-scheme: dark` root-variable override, preserving the warm `#fffaf4` default.

- [x] **Step 4: Run focused tests and verify they pass**

Run:

```bash
npm test -- tests/nav-bar.test.tsx tests/light-theme.test.ts
```

Expected: all focused tests pass with 24px icons, 12px labels, compact Create, and the light-theme contract.

### Task 3: Verify the full app build

**Files:**
- No additional files.

- [x] **Step 1: Run the full test suite**

```bash
npm test
```

- [x] **Step 2: Run TypeScript and production build checks**

```bash
npx tsc --noEmit
npm run build
```

- [x] **Step 3: Check the final diff**

```bash
git diff --check
```
