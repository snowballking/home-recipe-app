import { NextRequest } from "next/server";
import { detectPlatform, extractYouTubeVideoId } from "@/lib/extract/detect-platform";
import { fetchWebsiteContent, fetchPageImage } from "@/lib/extract/website";
import { extractWithHaiku, extractFromYouTubeVideo } from "@/lib/extract/ai-extract";

// ── POST /api/extract-recipe ────────────────────────────────────
// Accepts: { url: "..." } → auto-detect platform, extract recipe via AI
//
// Pipelines:
//   YouTube  → Gemini 2.5 Flash Lite (native video understanding)
//   Website / RedNote / Instagram → Jina Reader text → Claude Haiku 4.5

export async function POST(request: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!anthropicKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let body: { url?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return Response.json(
      { error: "Please provide a URL." },
      { status: 400 }
    );
  }

  let platform: ReturnType<typeof detectPlatform>;
  try {
    platform = detectPlatform(url);
  } catch {
    return Response.json({ error: "Invalid URL." }, { status: 400 });
  }

  try {
    let recipe: Record<string, unknown>;
    let imageUrl: string | null = null;

    if (platform === "youtube") {
      // ── YouTube: Gemini watches the video directly ──────────
      if (!geminiKey) {
        return Response.json(
          { error: "GEMINI_API_KEY is not configured. Required for YouTube video extraction." },
          { status: 500 }
        );
      }

      const [geminiRecipe, thumbnail] = await Promise.all([
        extractFromYouTubeVideo(url, geminiKey),
        Promise.resolve(getYouTubeThumbnail(url)),
      ]);
      recipe = geminiRecipe;
      imageUrl = thumbnail;
    } else {
      // ── Website / RedNote / Instagram: text → Haiku ─────────
      const isSocialMedia = platform === "rednote" || platform === "instagram";
      const textContent = await fetchWebsiteContent(url, {
        skipRobotsTxt: isSocialMedia,
      });

      const [haikuRecipe, pageImage] = await Promise.all([
        extractWithHaiku(textContent, anthropicKey),
        fetchPageImage(url),
      ]);
      recipe = haikuRecipe;
      imageUrl = pageImage;
    }

    if (imageUrl) recipe.hero_image_url = imageUrl;

    const pipelineLabel = platform === "youtube" ? "gemini-youtube" : `haiku-${platform}`;
    return Response.json({ recipe, pipeline: pipelineLabel });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Extraction failed";
    console.error(`${platform} extraction error:`, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

/** Construct YouTube thumbnail URL directly from video ID — no API call needed. */
function getYouTubeThumbnail(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  // maxresdefault is highest quality; falls back gracefully in browsers
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
