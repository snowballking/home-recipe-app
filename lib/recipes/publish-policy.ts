// IP-risk policy: every public recipe needs an image. Imported images and
// video screenshots are allowed, but the UI must show a copyright caution
// recommending the author's own photo or an AI-generated replacement.
import type { ImageSource } from "@/lib/types";

export function canPublishRecipe(opts: {
  imageSource: ImageSource | null;
  // Kept in the API for existing call sites. Chef status no longer bypasses
  // the requirement that every public recipe has a usable image.
  isChef: boolean;
}): {
  allowed: boolean;
  reason?: "needs_image";
  warning?: "imported_image_copyright";
} {
  if (!opts.imageSource) {
    return { allowed: false, reason: "needs_image" };
  }
  if (opts.imageSource === "imported") {
    return { allowed: true, warning: "imported_image_copyright" };
  }
  return { allowed: true };
}
