export interface RecipeFamilyMember {
  id: string;
  title: string | null;
  title_zh: string | null;
  authorName: string | null;
  variationNote?: string | null;
}

export interface RecipeFamilyOption {
  id: string;
  title: string | null;
  titleZh: string | null;
  authorName: string | null;
  variationNote: string | null;
  isOriginal: boolean;
}

export function getRecipeFamilyOriginalId(
  recipeId: string,
  originalRecipeId: string | null,
): string {
  return originalRecipeId ?? recipeId;
}

export function getRecipeFamilyOptions(
  original: RecipeFamilyMember,
  variations: RecipeFamilyMember[],
): RecipeFamilyOption[] {
  return [
    {
      id: original.id,
      title: original.title,
      titleZh: original.title_zh,
      authorName: original.authorName,
      variationNote: null,
      isOriginal: true,
    },
    ...variations.map((variation) => ({
      id: variation.id,
      title: variation.title,
      titleZh: variation.title_zh,
      authorName: variation.authorName,
      variationNote: variation.variationNote ?? null,
      isOriginal: false,
    })),
  ];
}
