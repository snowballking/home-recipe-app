# Simple Social Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the signed-out root landing page with the approved simple, centered Chef HideOut social-community login while preserving all existing authentication behavior.

**Architecture:** Keep the current client-side Supabase authentication handlers and `/login` redirect unchanged. Reshape only `app/page.tsx`: remove the old hero and feature-card presentation, then render one responsive brand frame and focused sign-in card. A component test will protect the new content hierarchy and the removal of the old identity.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Supabase Auth, Vitest, Testing Library

## Global Constraints

- The primary brand is exactly `Chef HideOut 私厨`.
- The visual direction is Concept A: Centered brand card.
- Use the existing warm cream, stone, and orange product palette.
- Do not add photography, illustration libraries, animation libraries, or dependencies.
- Preserve email/password sign-in, Google OAuth, loading states, inline errors, `/signup`, `/login` query forwarding, and successful navigation to `/market`.
- Remove the floating food emoji, “Our Family Kitchen” heading, and feature-card grid.
- The page must not scroll horizontally at a 390px viewport width.
- Do not change Supabase configuration, database state, invite policy, or signup behavior.

---

### Task 1: Build the centered Chef HideOut login

**Files:**
- Modify: `app/page.tsx`
- Create: `tests/login-page.test.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase/client`, `useRouter()` and `useSearchParams()` from `next/navigation`, and the existing `/signup`, `/auth/callback`, and `/market` routes.
- Produces: the existing default `Home()` page component with unchanged authentication handlers and a new centered login presentation.

- [ ] **Step 1: Read the installed Next.js client-component and form guidance**

Read the relevant files under `node_modules/next/dist/docs/` before editing `app/page.tsx`, as required by `AGENTS.md`. Confirm that the existing client component, Suspense boundary, event handlers, and form submission pattern remain valid for this installed Next.js version.

- [ ] **Step 2: Write the failing component test**

Create `tests/login-page.test.tsx` with navigation and Supabase mocks, then render the default page component:

```tsx
render(<Home />);

expect(await screen.findByLabelText("Chef HideOut 私厨")).toBeTruthy();
expect(screen.getByText("Your cooking community")).toBeTruthy();
expect(screen.getByRole("heading", { name: "Welcome back." })).toBeTruthy();
expect(screen.getByText("Recipes, meal plans, and the people you cook with—all in one place.")).toBeTruthy();
expect(screen.getByLabelText("Email")).toBeTruthy();
expect(screen.getByLabelText("Password")).toBeTruthy();
expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
expect(screen.getByRole("button", { name: "Continue with Google" })).toBeTruthy();
expect(screen.getByRole("link", { name: "Request an invite" })).toHaveAttribute("href", "/signup");
expect(screen.queryByRole("heading", { name: /Our Family Kitchen/i })).toBeNull();
expect(screen.queryByText("Recipe Book")).toBeNull();
```

- [ ] **Step 3: Run the test and verify RED**

Run: `npm test -- --run tests/login-page.test.tsx`

Expected: FAIL because the current page still renders “Our Family Kitchen”, “Welcome Home”, and the feature-card grid instead of the approved brand hierarchy.

- [ ] **Step 4: Implement the centered login presentation**

In `LandingContent`, preserve the current state and handler functions. Replace only the returned JSX and update the shared input/button styles:

```tsx
return (
  <main className="relative min-h-screen overflow-hidden bg-[#fffaf4] text-stone-950">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-[-14rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-orange-200/35 blur-3xl"
    />
    <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
      <div aria-label="Chef HideOut 私厨" className="text-center text-lg font-bold tracking-[-0.04em] sm:text-left">
        Chef HideOut <span className="text-orange-600">私厨</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <section aria-labelledby="login-heading" className="w-full max-w-sm rounded-3xl border border-orange-100 bg-white/95 p-6 shadow-[0_24px_70px_rgba(86,52,30,0.10)] backdrop-blur sm:p-8">
          <p>Your cooking community</p>
          <h1 id="login-heading">Welcome back.</h1>
          <p>Recipes, meal plans, and the people you cook with—all in one place.</p>
        </section>
        <p>Discover recipes · Share variations · Plan together</p>
        <p>This is a private community. New accounts need admin approval.</p>
      </div>
    </div>
  </main>
);
```

Place the existing email/password form, alert, divider, Google button, and invite paragraph inside the section immediately after the supporting copy. Use a single soft orange background glow. Remove `FeatureCard` entirely. Keep explicit labels, `required`, autocomplete attributes, `role="alert"`, the Google logo, disabled states, and existing handler calls.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `npm test -- --run tests/login-page.test.tsx`

Expected: PASS.

- [ ] **Step 6: Run automated verification**

Run:

```bash
npm test
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all tests pass, TypeScript reports no errors, the production build succeeds, and the diff has no whitespace errors. The existing Next.js middleware-to-proxy deprecation notice may remain.

- [ ] **Step 7: Verify desktop and mobile layouts in the local browser**

Open `http://localhost:3000/` in the local development environment. Confirm:

- Desktop shows one centered card and a restrained top-left brand.
- 390×844 mobile shows the centered brand above the card.
- `document.documentElement.scrollWidth <= window.innerWidth`.
- Email, password, Sign in, Continue with Google, and Request an invite remain visible.
- No “Our Family Kitchen”, floating food emoji, or feature-card grid appears.
- Do not submit credentials or mutate authentication state during verification.

- [ ] **Step 8: Preserve the local application changes for user testing**

Do not stage, commit, push, deploy, or apply database changes for the application edit. Leave the verified development server running at `http://localhost:3000/` for the user.
