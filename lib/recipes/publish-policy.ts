// IP-risk policy (ROADMAP weeks 1-2): publishing a recipe to the public
// Market requires the author's own photo, an AI placeholder image, or a
// licensed chef account. Scraped/imported photos may not be published.
import type { ImageSource } from "@/lib/types";

export function canPublishRecipe(opts: {
  imageSource: ImageSource | null;
  isChef: boolean;
}): { allowed: boolean; reason?: "needs_own_photo" } {
  if (opts.isChef) return { allowed: true };
  if (opts.imageSource === "user_upload" || opts.imageSource === "ai_generated") {
    return { allowed: true };
  }
  return { allowed: false, reason: "needs_own_photo" };
}
