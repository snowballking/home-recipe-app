# Saved recipes and meal-plan selection design

**Date:** 2026-08-02
**Status:** Approved

## Goal

Give every signed-in cook a reliable private Saved Recipes collection, and make
those recipes the easiest starting point when filling a weekly meal plan.

## Chosen approach

Use a dedicated authenticated route, `/dashboard/saved-recipes`, rather than an
anchor inside a profile page. The profile menu's **Saved Recipes** item points to
this route.

The route loads `recipe_saves` for the current authenticated user and joins the
saved recipe records. This keeps the collection private through the existing RLS
policy and removes the profile page's server-side `isOwner` rendering dependency.

## Saved Recipes page

- Uses the existing Saved Recipes title, privacy explanation, count, recipe
  cards, and Discover empty state.
- Shows a loading state while the authenticated client request resolves.
- Omits saved rows whose recipe is no longer available to the viewer.
- Does not expose another user's collection or introduce a public collection
  URL.
- The former owner-only collection section is removed from profile pages so the
  menu always leads to the canonical collection surface.

## Meal-plan picker

When adding a recipe to a meal slot:

- Add **Saved** as the first source tab, alongside **All**, **My Recipes**, and
  **Community**.
- Fetch the current user's saved recipe IDs while loading the picker data.
- Open on **Saved** when at least one saved recipe exists; otherwise use **All**.
- Filter the existing picker recipe list by those saved IDs; selecting an item
  adds the same recipe to the meal-plan slot, with no duplicate recipe record.
- Keep search and category filtering available on the Saved tab and retain all
  existing source filters.

## Data and security

No schema or policy migration is required. Existing `recipe_saves` RLS keeps
reads limited to the owner. The implementation uses the signed-in browser client
for the personal collection and only passes saved IDs into the existing
meal-plan picker.

## Verification

- Add focused tests for the dedicated collection query/rendering and its empty
  state.
- Update the profile-menu test to assert the new route.
- Add picker filter tests covering saved recipes, default selection, search, and
  the no-saves fallback.
- Run the focused test suite and `npm run build` before committing and deploying.
