# Simple Social Login Design

**Date:** 2026-08-02
**Status:** Approved visual direction
**Scope:** The signed-out root page that contains the Chef HideOut login form

## Goal

Replace the older “Our Family Kitchen” landing page with a simple login experience that matches the product’s current identity: **Chef HideOut 私厨**, a social recipe community for discovering recipes, sharing variations, planning meals, and eventually buying groceries.

## Approved direction

Use the selected **Concept A: Centered brand card**.

- Show `Chef HideOut 私厨` as the primary brand at the top of the page.
- Center one compact sign-in card in the viewport.
- Use the app’s warm cream, stone, and orange palette.
- Keep decoration restrained to one or two soft background shapes; remove the floating food emoji, feature-card grid, and “Our Family Kitchen” identity.
- Keep the interface typography-first with no recipe photograph.

## Content hierarchy

The sign-in card contains:

1. Small context label: **Your cooking community**.
2. Heading: **Welcome back.**
3. Supporting copy: **Recipes, meal plans, and the people you cook with—all in one place.**
4. Email and password fields.
5. Primary **Sign in** action.
6. Divider and existing **Continue with Google** action.
7. Existing **Request an invite** link.

Below the card, show a quiet product line: **Discover recipes · Share variations · Plan together**. Keep the existing private-community approval note, but reduce its emphasis so it does not compete with sign-in.

## Responsive behavior

- Desktop: brand sits near the top-left of the centered content frame while the login card remains visually centered.
- Mobile: brand moves into the centered column above the card; the card uses nearly the full available width with comfortable page padding.
- The full experience must fit without horizontal scrolling at 390px viewport width.
- Controls retain touch-friendly heights and clear focus states.

## Authentication behavior

This is a visual and copy redesign only. Preserve:

- Supabase email/password sign-in.
- Google OAuth sign-in and redirect behavior.
- `error` and `next` query-parameter handling through `/login`.
- Loading and disabled states.
- Successful navigation to `/market`.
- The `/signup` invite-request link.

Errors remain inline within the card and entered form values remain intact after an unsuccessful attempt.

## Accessibility

- Keep explicit labels for email and password inputs.
- Preserve correct autocomplete values and required fields.
- Keep the error message as an alert.
- Use visible keyboard focus states and sufficient text/background contrast.
- Do not use background shapes as meaningful content.

## Testing and verification

- A component test confirms the new brand, social-community copy, and existing sign-in actions.
- The test confirms the removed “Our Family Kitchen” heading and feature cards do not return.
- Existing authentication handlers remain covered through stable form labels and button names.
- TypeScript and the production build must pass.
- Browser verification covers desktop and 390px mobile layouts, including horizontal overflow.

## Out of scope

- Authentication-provider or Supabase changes.
- Signup-page redesign.
- Password-reset functionality.
- New illustrations, photography, or animation.
- Changing invite or admin-approval policies.
