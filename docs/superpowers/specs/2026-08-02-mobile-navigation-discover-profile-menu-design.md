# Mobile Navigation, Discover Categories, and Profile Menu Design

**Date:** 2026-08-02
**Status:** Approved design
**Scope:** Mobile navigation sizing, Discover category layout, and authenticated profile/logout access

## Context

The production mobile interface currently has three usability problems:

1. The Home, Discover, Plans, and Cart icons and labels in the bottom navigation are too small.
2. Discover renders all category pills as a normal wrapping row, which becomes a tall vertical stack on a phone.
3. Logout appears as a standalone northeast arrow beside the profile avatar, so its meaning is unclear.

The selected direction keeps the existing orange-and-cream visual system while improving mobile legibility and making account actions explicit.

## Approved Experience

### Larger mobile bottom navigation

- Keep the five existing destinations: Home, Discover, Create, Plans, and Cart.
- Replace the small text glyphs for Home, Discover, Plans, and Cart with clear inline SVG icons.
- Render standard tab icons at 24 by 24 pixels.
- Render tab labels at 12 pixels with a medium-to-semibold weight.
- Preserve the raised circular Create control as the visual center of the navigation.
- Keep the current active orange color, inactive stone color, disabled Cart treatment, safe-area padding, and route behavior.
- Desktop navigation remains unchanged.

### Compact Discover category grid

- On phone-sized screens, show the All filter and ten recipe categories in a three-column grid.
- Use compact pills with approximately 10–11 pixel labels, reduced horizontal padding, and a consistent row height.
- The eleven options occupy four rows and stay within roughly one-third of a typical phone viewport.
- All categories remain visible without horizontal scrolling or a disclosure step.
- Long labels may use shortened display wording on mobile while retaining the same database category value and accessible name.
- At the `sm` breakpoint and above, retain the existing flexible wrapping layout and its 14-pixel labels.
- Keep Latest/Popular as a separate control below or beside the category group, depending on available width.
- Search, filtering, recipe loading, and category-selection behavior do not change.

### Profile avatar menu

- Remove the standalone arrow logout button from the top navigation.
- Change the authenticated avatar into a menu trigger while preserving the user's initial and profile styling.
- The menu is anchored below the avatar and contains, in order:
  1. My Profile
  2. Edit Profile
  3. Log out
- My Profile links to `/user/{user.id}`.
- Edit Profile links to `/dashboard/profile`.
- Log out uses the existing Supabase sign-out flow, redirects to `/login`, and shows a disabled/loading state while running.
- The menu closes after selecting a navigation link, pressing Escape, or clicking outside it.
- The trigger exposes expanded state and menu relationships to assistive technology.
- Signed-out navigation remains unchanged.

## Component Boundaries

### `NavBar`

`NavBar` remains responsible for route-aware primary navigation and account actions. The avatar popover stays inside this component because it depends on the existing auth, router, language, and Supabase state already available there.

Small internal helpers may be introduced for tab icons and profile-menu items so the markup is readable and each icon has one source of truth. No new global state or database data is required.

### `DiscoverPage`

`DiscoverPage` keeps its current recipe query and filtering pipeline. Only the category-control presentation changes responsively. The mobile grid and larger-screen wrapping layout render the same category data and update the same `category` state.

## Responsive Behavior

- Below `sm`: three category columns, compact label treatment, full-width Latest/Popular placement when necessary.
- From `sm` upward: existing wrapping pills and layout spacing.
- Below `md`: enlarged bottom navigation is visible.
- From `md` upward: the desktop primary navigation remains visible and the bottom bar stays hidden.

The category region should not introduce horizontal page overflow at 320, 375, 390, or 430 pixel viewport widths.

## Error and Loading Behavior

- Logout preserves the existing loading lock so repeated sign-out requests cannot be fired.
- If Supabase sign-out returns, navigation proceeds through the current redirect behavior.
- Discover loading, empty, and error behavior are not otherwise changed.
- Menu opening and closing are client-only interactions and require no network request.

## Testing

Automated coverage will verify:

- authenticated navigation renders a profile menu trigger instead of the arrow logout button;
- the menu exposes My Profile, Edit Profile, and Log out actions;
- Log out calls Supabase sign-out and redirects to `/login`;
- mobile navigation uses the enlarged icon and label contracts while keeping five destinations;
- Discover renders all eleven category controls from the shared category definition;
- the mobile category container uses a three-column grid and the larger-screen layout retains wrapping behavior;
- selecting a category still filters recipes through existing state.

Manual browser verification will cover 390 by 844 mobile and 1280 by 720 desktop viewports, checking visibility, overflow, menu positioning, and active navigation styling.

## Out of Scope

- Changing navigation destinations or adding Cart functionality.
- Redesigning the desktop navigation.
- Changing recipe categories or stored category values.
- Redesigning the public profile or edit-profile pages.
- Deploying to production before the user reviews the development preview and explicitly approves another push.
