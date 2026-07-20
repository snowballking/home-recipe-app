import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectPlatform, extractYouTubeVideoId } from "@/lib/extract/detect-platform";
import { fetchWebsiteContent, fetchPageImage } from "@/lib/extract/website";
import { extractWithHaiku, extractFromYouTubeVideo, normaliseIngredientUnits } from "@/lib/extract/ai-extract";

// ── POST /api/extract-recipe ────────────────────────────────────
// Accepts: { url: "..." } → auto-detect platform, extract recipe via AI
//
// Pipelines:
//   YouTube  → Gemini 2.5 Flash Lite (native video understanding)
//   Website / RedNote / Instagram → Jina Reader text → Claude Haiku 4.5

/** Reject URLs that point at private/internal networks (SSRF protection). */
function isSafePublicUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  // IPv6 loopback / link-local / unique-local (bracketed hosts always contain ":")
  if (host.includes(":") && (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd"))) return false;
  // IPv4 private / reserved ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return false;
    }
  }
  return true;
}

export async function POST(request: NextRequest) {
  // Require a signed-in user (prevents anonymous use of the AI APIs)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

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

  if (!isSafePublicUrl(url)) {
    return Response.json({ error: "Invalid URL." }, { status: 400 });
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
    let chefId: string | null = null;

    if (platform === "youtube") {
      // ── YouTube: Gemini watches the video directly ──────────
      if (!geminiKey) {
        return Response.json(
          { error: "GEMINI_API_KEY is not configured. Required for YouTube video extraction." },
          { status: 500 }
        );
      }

      const [geminiRecipe, thumbnail, channel] = await Promise.all([
        extractFromYouTubeVideo(url, geminiKey),
        Promise.resolve(getYouTubeThumbnail(url)),
        fetchYouTubeChannel(url),
      ]);
      recipe = geminiRecipe;
      imageUrl = thumbnail;
      if (channel) {
        const { data: upsertedChefId } = await supabase.rpc("upsert_chef_for_channel", {
          p_name: channel.name,
          p_channel_url: channel.channelUrl,
          p_source_site: "youtube",
        });
        chefId = (upsertedChefId as string | null) ?? null;
      }
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

    // Normalise ingredient units (imperial → metric, abbreviations → full words)
    if (Array.isArray(recipe.ingredients)) {
      recipe.ingredients = normaliseIngredientUnits(
        recipe.ingredients as { name: string; quantity: string; unit: string }[]
      );
    }
    if (Array.isArray(recipe.ingredients_zh)) {
      recipe.ingredients_zh = normaliseIngredientUnits(
        recipe.ingredients_zh as { name: string; quantity: string; unit: string }[]
      );
    }

    const pipelineLabel = platform === "youtube" ? "gemini-youtube" : `haiku-${platform}`;
    return Response.json({ recipe, pipeline: pipelineLabel, chef_id: chefId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Extraction failed";
    console.error(`${platform} extraction error:`, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

/** Resolve the YouTube channel behind a video URL via oEmbed (no API key).
 *  Non-fatal: any failure returns null and the import proceeds without a chef. */
async function fetchYouTubeChannel(
  url: string
): Promise<{ name: string; channelUrl: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { author_name?: unknown; author_url?: unknown };
    if (typeof data.author_name !== "string" || typeof data.author_url !== "string") return null;
    return { name: data.author_name, channelUrl: data.author_url };
  } catch {
    return null;
  }
}

/** Construct YouTube thumbnail URL directly from video ID — no API call needed. */
function getYouTubeThumbnail(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  // maxresdefault is highest quality; falls back gracefully in browsers
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
