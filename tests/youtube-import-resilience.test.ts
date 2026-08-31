import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/extract-recipe/route";
import { extractFromYouTubeVideo } from "@/lib/extract/ai-extract";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "member-1" } } }),
    },
    rpc: async () => ({ data: null, error: null }),
  }),
}));

const geminiUnavailable = () =>
  new Response(
    JSON.stringify({
      error: {
        code: 503,
        message:
          "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
        status: "UNAVAILABLE",
      },
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );

describe("YouTube recipe import resilience", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("retries a temporary Gemini failure and returns the video recipe", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(geminiUnavailable())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify({ title: "Noodle Soup" }) }],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = extractFromYouTubeVideo(
      "https://www.youtube.com/watch?v=recipe123",
      "gemini-key",
    );
    const resultAssertion = expect(resultPromise).resolves.toEqual({
      title: "Noodle Soup",
    });

    await vi.runAllTimersAsync();
    await resultAssertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the transcript pipeline when Gemini stays unavailable", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-key");
    vi.stubEnv("GEMINI_API_KEY", "gemini-key");
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("generativelanguage.googleapis.com")) {
        return geminiUnavailable();
      }
      if (url.startsWith("https://www.youtube.com/oembed")) {
        return new Response(null, { status: 404 });
      }
      if (url.startsWith("https://www.youtube.com/watch")) {
        return new Response(
          `<html><title>Garlic Noodles - YouTube</title><script>"shortDescription":"Boil noodles, then toss with garlic, soy sauce, and spring onions until glossy."</script></html>`,
          { status: 200, headers: { "Content-Type": "text/html" } },
        );
      }
      if (url === "https://api.anthropic.com/v1/messages") {
        return new Response(
          JSON.stringify({
            content: [
              { text: JSON.stringify({ title: "Garlic Noodles" }) },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/extract-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://www.youtube.com/watch?v=recipe123",
      }),
    });
    const responsePromise = POST(request);

    await vi.runAllTimersAsync();
    const response = await responsePromise;
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      recipe: { title: "Garlic Noodles" },
      pipeline: "haiku-youtube-fallback",
    });
  });
});
