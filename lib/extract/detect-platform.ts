// Detect which platform a URL belongs to and route to the right pipeline.

export type Platform = "youtube" | "website" | "rednote" | "instagram";

export function detectPlatform(url: string): Platform {
  const host = new URL(url).hostname.toLowerCase();

  if (
    host.includes("youtube.com") ||
    host.includes("youtu.be") ||
    host.includes("m.youtube.com")
  ) {
    return "youtube";
  }

  if (
    host.includes("xiaohongshu.com") ||
    host.includes("xhslink.com") ||
    host.includes("rednote")
  ) {
    return "rednote";
  }

  if (host.includes("instagram.com") || host.includes("instagr.am")) {
    return "instagram";
  }

  return "website";
}

export function extractYouTubeVideoId(url: string): string | null {
  const u = new URL(url);

  // https://www.youtube.com/watch?v=VIDEO_ID
  if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) {
    return u.searchParams.get("v");
  }

  // https://youtu.be/VIDEO_ID
  if (u.hostname.includes("youtu.be")) {
    return u.pathname.slice(1).split("/")[0] || null;
  }

  // https://www.youtube.com/shorts/VIDEO_ID
  const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}
