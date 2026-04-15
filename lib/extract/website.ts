// Website recipe extraction using Jina Reader API for clean markdown,
// with a raw-fetch fallback if Jina is unavailable.
// Respects robots.txt before direct scraping (skipped for personal-use social media imports).

// Standard browser user agent — needed for social media sites that block bots
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Check whether the site's robots.txt allows our bot to access the path. */
async function isAllowedByRobotsTxt(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const robotsUrl = `${parsed.origin}/robots.txt`;
    const res = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return true; // no robots.txt → assume allowed
    const text = await res.text();

    // Simple parser: check for "Disallow: /" for our user-agent or *
    const lines = text.split("\n").map((l) => l.trim().toLowerCase());
    let inRelevantBlock = false;
    for (const line of lines) {
      if (line.startsWith("user-agent:")) {
        const agent = line.split(":")[1]?.trim();
        inRelevantBlock = agent === "*" || agent === "recipebot";
      }
      if (inRelevantBlock && line.startsWith("disallow:")) {
        const path = line.split(":").slice(1).join(":").trim();
        if (path === "/" || parsed.pathname.startsWith(path)) {
          return false; // blocked
        }
      }
    }
    return true;
  } catch {
    return true; // if we can't fetch robots.txt, don't block the user
  }
}

/** Try to extract og:image or other meta image from a page URL. */
export async function fetchPageImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Try og:image first, then twitter:image
    const ogMatch =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
      );
    if (ogMatch?.[1]) return ogMatch[1];

    const twitterMatch =
      html.match(
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
      );
    if (twitterMatch?.[1]) return twitterMatch[1];

    return null;
  } catch {
    return null;
  }
}

export interface FetchOptions {
  /** Skip robots.txt check — use for personal-use social media imports */
  skipRobotsTxt?: boolean;
}

export async function fetchWebsiteContent(
  url: string,
  options?: FetchOptions
): Promise<string> {
  const skipRobots = options?.skipRobotsTxt ?? false;

  // ── Try Jina Reader API first (returns clean markdown) ────────
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "text",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (jinaRes.ok) {
      const text = await jinaRes.text();
      if (text.length > 100) {
        return text.slice(0, 15_000);
      }
    }
  } catch {
    // Jina failed — fall through to raw fetch
  }

  // ── Respect robots.txt before direct scraping (unless skipped) ──
  if (!skipRobots) {
    const allowed = await isAllowedByRobotsTxt(url);
    if (!allowed) {
      throw new Error(
        "This website does not allow automated access according to its robots.txt. Please enter the recipe manually."
      );
    }
  }

  // ── Fallback: raw HTML fetch + strip tags ─────────────────────
  const pageRes = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });

  if (!pageRes.ok) {
    throw new Error(`Could not fetch the page (HTTP ${pageRes.status}).`);
  }

  const html = await pageRes.text();

  // Strip scripts, styles, and tags
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 50) {
    throw new Error(
      "The page did not contain enough readable text. This may be a video-only post — try pasting the recipe text manually."
    );
  }

  return text.slice(0, 15_000);
}
