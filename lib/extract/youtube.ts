// YouTube transcript extraction without any npm dependency.
// Fetches the watch page, extracts captions track URL from the player config,
// fetches the timed-text XML, and returns plain text.

import { extractYouTubeVideoId } from "./detect-platform";

export async function fetchYouTubeTranscript(url: string): Promise<string> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) throw new Error("Could not extract YouTube video ID from URL.");

  // Fetch the watch page HTML
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!pageRes.ok) {
    throw new Error(`YouTube returned HTTP ${pageRes.status}`);
  }

  const html = await pageRes.text();

  // Extract the captions track URL from the player response JSON embedded in the page.
  // YouTube embeds a JSON blob that contains "captionTracks":[{"baseUrl":"...","languageCode":"en",...}]
  const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
  if (!captionMatch) {
    // No captions — fall back to title + description extraction
    return extractYouTubeMetadata(html);
  }

  let tracks: Array<{ baseUrl: string; languageCode: string }>;
  try {
    tracks = JSON.parse(captionMatch[1]);
  } catch {
    return extractYouTubeMetadata(html);
  }

  if (!tracks.length) {
    return extractYouTubeMetadata(html);
  }

  // Prefer English, fall back to first available
  const enTrack =
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => t.languageCode.startsWith("en")) ||
    tracks[0];

  // Fetch the timed-text XML
  const captionRes = await fetch(enTrack.baseUrl, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!captionRes.ok) {
    return extractYouTubeMetadata(html);
  }

  const xml = await captionRes.text();

  // Parse the XML <text> elements to plain text
  const textSegments: string[] = [];
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const decoded = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim();
    if (decoded) textSegments.push(decoded);
  }

  const transcript = textSegments.join(" ");
  if (transcript.length < 30) {
    return extractYouTubeMetadata(html);
  }

  // Prepend video title for extra context
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch
    ? titleMatch[1].replace(" - YouTube", "").trim()
    : "";

  return `Video title: ${title}\n\nTranscript:\n${transcript}`.slice(0, 15_000);
}

/** Fallback: pull title + description from the page if no captions exist. */
function extractYouTubeMetadata(html: string): string {
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch
    ? titleMatch[1].replace(" - YouTube", "").trim()
    : "Unknown";

  const descMatch = html.match(
    /"shortDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/
  );
  const description = descMatch
    ? descMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
    : "";

  const result = `Video title: ${title}\n\nDescription:\n${description}`;
  if (result.length < 50) {
    throw new Error(
      "This YouTube video has no captions and very little metadata. Please try a different video or enter the recipe manually."
    );
  }
  return result.slice(0, 15_000);
}
