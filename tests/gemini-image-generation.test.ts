import { afterEach, describe, expect, it, vi } from "vitest";
import { generatePlaceholderImage } from "@/lib/images/generate-placeholder";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Gemini recipe image generation", () => {
  it("requests an image from the stable Gemini 3.1 Flash Image model", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: "model",
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: "generated-image-base64",
                    },
                  },
                ],
              },
              finishReason: "STOP",
              index: 0,
            },
          ],
          usageMetadata: {
            promptTokenCount: 20,
            candidatesTokenCount: 1,
            totalTokenCount: 21,
          },
          modelVersion: "gemini-3.1-flash-image",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await generatePlaceholderImage(
      {
        title: "Tomato Soup",
        cuisine: "Italian",
        ingredients: [{ name: "tomato" }, { name: "basil" }],
      },
      "gemini-test-key",
    );

    expect(result).toEqual({
      imageBase64: "generated-image-base64",
      mimeType: "image/png",
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    expect(String(requestUrl)).toBe(
      "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
    );
    expect(requestInit?.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-goog-api-key": "gemini-test-key",
    });

    const requestBody = JSON.parse(String(requestInit?.body));
    expect(requestBody.generationConfig).toEqual({
      responseModalities: ["Image"],
    });
  });
});
