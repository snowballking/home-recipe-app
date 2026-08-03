# Chef Feed Attribution Design

## Goal

Credit public recipes on Home (`/market`) and Discover (`/discover`) to their assigned curated Chef, never to the app member who uploaded the record.

## Attribution rules

- A recipe with a populated `chef_id` displays its assigned Chef's name and a `Chef` role badge.
- A recipe with no assigned Chef remains visible in both feeds, but displays no author or creator credit.
- Feed attribution is not a link. The existing linked Chef attribution on the recipe-details page remains the sole Chef-profile link.
- Uploader profile names are not loaded or shown by either feed.

## Presentation

- Home recipe feed cards show a non-interactive Chef identity block in their top-left header: avatar initial, the Chef's name prefixed by `By`, and a small `Chef` badge.
- Discover recipe cards show the equivalent non-interactive Chef credit in their top-left image overlay. Existing recipe-status badges remain on the top-right.
- When no Chef is assigned, Home removes the author header while retaining any variation badge; Discover omits the overlay entirely.

## Data flow and component boundaries

- Home and Discover select the optional `chefs(id, name)` relationship from `recipes`.
- Each page derives display attribution only from that relationship. `profiles(displayname)` and user-derived `author_name` are removed from these feed queries.
- `RecipeFeedCard` receives an optional Chef display object and has no dependency on `user_id` for attribution or linking.
- `RecipeCard` receives optional Chef display data for its feed credit. Its existing uses outside Home and Discover retain their current behavior unless they opt into the Chef credit.

## Validation

- Home query tests verify the Chef relationship is selected and uploader profiles are not selected.
- Home card tests cover an assigned Chef's non-link attribution and an unassigned recipe's lack of attribution.
- Discover tests verify the same Chef-only mapping and top-left credit behavior.
- The targeted tests, full test suite, TypeScript check, and production build must pass before the review preview is updated.

## Constraints

- Do not add or modify database records; unmatched recipes will be assigned by an administrator later.
- Preserve the existing recipe-details Chef link.
- Do not push or deploy to production. Update only a Vercel preview for review.
- Preserve unrelated local changes, including `HANDOFF.md`, `.superpowers/`, and the duplicate report-button file.
