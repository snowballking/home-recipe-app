export type FeedTab = "for-you" | "following";

export function filterFeedRecipes<T extends { user_id: string }>(
  recipes: T[],
  tab: FeedTab,
  followedUserIds: Set<string>,
): T[] {
  if (tab === "for-you") return recipes;
  return recipes.filter((recipe) => followedUserIds.has(recipe.user_id));
}

type DiscoverSearchRecipe = {
  title: string;
  title_zh: string | null;
  description: string | null;
  description_zh: string | null;
  cuisine: string | null;
  dietary_tags: string[];
};

export function filterDiscoverRecipes<T extends DiscoverSearchRecipe>(recipes: T[], search: string): T[] {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return recipes;

  return recipes.filter((recipe) => [
    recipe.title,
    recipe.title_zh,
    recipe.description,
    recipe.description_zh,
    recipe.cuisine,
    ...recipe.dietary_tags,
  ].some((value) => value?.toLocaleLowerCase().includes(query)));
}
