# Member Profile and Chefs Navigation Design

## Goal

Make a member's public recipe collection compact and complete, and make the existing Chefs directory discoverable from the primary mobile navigation without losing the future Cart affordance.

## Profile recipes

The public profile at `/user/[id]` will load every public recipe owned by that member. Recipes without a `source_url` (original recipes and variations) display before imported recipes; each group remains newest first. The page will not expose non-public recipes.

Only the profile collection uses a compact recipe-card presentation. It will render one column on small screens, two columns at the small breakpoint, and three columns at large widths. Compact cards have a shorter image and tighter content spacing and type, while preserving the image, title, recipe status badges, rating, core metadata, and tags. Other recipe-card consumers retain their current appearance.

## Navigation

`/chefs` is already the canonical directory route. The last item in the five-item mobile bottom navigation changes from Cart to a direct Chefs link with a chef icon and the existing bilingual label (`Chefs` / `厨师`). Its active state includes `/chefs` and chef-detail routes.

Cart moves to the header, immediately next to the language switcher. It is an icon-only button with the existing cart icon and accessible Cart label. It has no destination yet: activating it shows the existing short, live-region “Coming soon” feedback. The text Cart header action and the Cart entry in the bottom bar are removed.

## Data and component boundaries

- `lib/profile-recipes.ts` owns deterministic originals-before-imported ordering for `Recipe[]`.
- `app/user/[id]/page.tsx` owns the private server query and passes ordered recipes to `RecipeCard`.
- `RecipeCard` accepts an optional `compact` boolean to contain profile-only visual density changes.
- `lib/navigation.ts` owns the route and active-state model for the Chefs mobile destination.
- `NavBar` renders the navigation model and preserves Cart's temporary feedback behavior.

## Validation

Tests will demonstrate recipe sorting, render a public profile with imported recipes after originals in compact mode, and verify the mobile Chefs destination plus icon-only Cart feedback. The focused tests, complete test suite, TypeScript check, and production build must pass before the preview is created.

## Constraints

- Add all new user-visible copy in English and Simplified Chinese. This change reuses existing bilingual labels.
- Do not push to production. A Vercel preview deployment is the review artifact.
- Preserve the unrelated local `HANDOFF.md`, `.superpowers/`, and duplicate report-button changes.
