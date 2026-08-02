# Structured Recipe Variation Overlay Design

**Date:** 2026-08-02
**Status:** Approved interaction design
**Scope:** Home recipe cards, recipe-detail variation actions, variation creation, and variation-detail explanation

## Goal

Make a variation feel like a small, understandable overlay on an existing recipe rather than a second full recipe form. A cook records only what they changed. Other users can see those changes in context, while cooking, nutrition, meal-plan, and grocery features continue to receive a complete final recipe.

This design refines the variation behaviour in `2026-08-02-social-feed-grocery-ux-design.md`. It does not replace the materialised-recipe storage decision.

## User-facing model

The original recipe is always the base. A variation contains:

1. A required short description of what is different.
2. Structured ingredient changes.
3. Structured instruction changes.

The variation editor does not expose copied title, recipe description, photo, servings, timing, difficulty, cuisine, meal type, category, dietary tags, nutrition, source URL, or other inherited metadata. These values remain inherited from the original recipe for the materialised saved row.

The editor does not support reordering existing instruction steps in this version.

## Entry points

- Home recipe cards do not show **Make it your own**.
- Recipe detail remains the deliberate place to start a variation.
- A signed-in non-owner sees **Make it your own** on the recipe detail.
- Selecting it opens the focused variation editor for that recipe.

## Variation editor

### Original-recipe context

The top of the editor shows the original recipe title and creator with a link back to its detail page. The copy explains that unchanged content will be inherited.

### What is different?

A required text area stores the variation summary in `variation_note`. Examples include “less oil and a brighter lime finish” or “made nut-free for school lunches.” This summary is used in the recipe-family selector and variation explanation.

### Ingredient changes

The original ingredient list is shown as reference rows. The cook can create only these operations:

- **Replace:** select one original ingredient and enter the replacement ingredient, quantity, and unit.
- **Add:** enter a new ingredient, quantity, and unit.
- **Remove:** select one original ingredient to omit.

A replacement is an applied substitution in this variation, not an optional suggestion. Therefore the replacement—not the original ingredient—is included in the variation’s final grocery list.

The UI prevents contradictory operations on the same original ingredient, such as replacing and removing it simultaneously. Cancelling an operation restores the inherited ingredient.

### Instruction changes

The original numbered steps are shown as reference rows. The cook can:

- **Rewrite** an original step.
- **Remove** an original step.
- **Add** a new step before or after an original step.

Edited and new steps are visually marked. Removed steps remain visible in the editor with a removed state and can be restored before saving. Existing steps cannot be dragged or reordered.

### Saving

The variation starts private. Saving applies the structured changes to the original snapshot and inserts a complete materialised recipe row. Publishing remains a separate action after creation, consistent with the existing private-by-default policy.

## Storage and data flow

The existing `recipes.original_recipe_id`, `recipes.variation_note`, and full-copy recipe model remain in use. The existing `recipes.variation_diff` JSONB column stores a versioned structured overlay.

```ts
type VariationDiffV1 = {
  version: 1;
  ingredientChanges: Array<
    | { kind: "replace"; originalIndex: number; from: Ingredient; to: Ingredient }
    | { kind: "add"; afterOriginalIndex: number | null; ingredient: Ingredient }
    | { kind: "remove"; originalIndex: number; ingredient: Ingredient }
  >;
  stepChanges: Array<
    | { kind: "edit"; originalIndex: number; from: string; to: string }
    | { kind: "add"; afterOriginalIndex: number | null; step: string }
    | { kind: "remove"; originalIndex: number; step: string }
  >;
};
```

Each operation includes the original value as a snapshot. This keeps the “What changed” explanation meaningful even if the original recipe is edited later.

On save:

1. Load and retain the original recipe snapshot.
2. Validate all operations against that snapshot.
3. Apply ingredient changes to produce the final `ingredients` array.
4. Apply instruction changes to produce the final `steps` array.
5. Copy inherited recipe metadata according to the existing materialised-fork rules.
6. Reset ownership, visibility, social counters, and protected image fields as required for a new private variation.
7. Save the structured operations to `variation_diff` and the complete arrays to `ingredients` and `steps`.

No runtime base-plus-overlay merge is required for nutrition, meal planning, or groceries. Those consumers continue reading the materialised final arrays.

## Recipe-detail presentation

The recipe-family selector continues to show the original first and public variations beneath it. Each variation shows its creator and short variation summary.

When a variation is selected:

- The original recipe remains clearly credited as the base.
- A **What changed** panel summarizes ingredient replacements, additions, removals, and instruction edits.
- The main ingredient and instruction sections show the complete final version.
- Save, meal-plan, and future cart actions operate on that selected materialised version.

Legacy variations without a structured `variation_diff` continue to show their `variation_note` and complete final recipe without the structured change list.

## Validation and error handling

- A variation requires a non-empty change summary.
- At least one valid ingredient or instruction operation is required.
- Blank added ingredients and blank added or edited steps are rejected.
- Operation indices must point to items in the loaded original snapshot.
- One original ingredient or step cannot have multiple terminal operations.
- If the source recipe cannot be loaded, the editor shows an error and does not expose a blank variation form.
- A failed save keeps all entered overlay operations in the editor.

## Bilingual requirements

Every new interface label, helper, validation error, action, and change-type description must be present in English and Simplified Chinese. User-entered recipe and variation content is displayed as entered unless a translated content value exists.

## Testing

- Unit tests cover applying valid ingredient and step operations to a recipe snapshot.
- Unit tests cover invalid indices, contradictory operations, and blank new content.
- Component tests confirm Home cards omit the variation CTA.
- Component tests confirm recipe detail retains the variation CTA for signed-in non-owners.
- Component tests cover the focused editor’s visible sections and operation controls.
- Component tests cover the structured “What changed” presentation and legacy-note fallback.
- Browser verification covers the editor and selected-variation detail on desktop and mobile.

## Out of scope

- Reordering existing instruction steps.
- Live overlay merging for downstream recipe consumers.
- Fuzzy matching of similar recipes.
- Universal-cart persistence or grocery-provider checkout.
- Changing the existing publication policy beyond keeping new variations private by default.

## Acceptance criteria

- Home recipe cards contain no **Make it your own** action.
- Recipe detail remains the only creation entry point for a variation.
- A variation creator edits only the change summary, ingredient operations, and instruction operations.
- Ingredient operations support replace, add, and remove.
- Instruction operations support rewrite, add before or after, and remove, but not reorder.
- Saving produces both a versioned structured overlay and complete final ingredient and instruction arrays.
- A selected variation explains its structured changes while displaying its complete final recipe.
- Existing variations without structured operations still render correctly.
