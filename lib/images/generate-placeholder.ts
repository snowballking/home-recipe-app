// AI placeholder image generation (swappable provider).
// Current provider: Gemini image model. If Chinese-dish realism
// underwhelms, swap the implementation (e.g. Seedream 4.0) but keep the
// same function signature (ROADMAP iter. 6).

export interface PlaceholderImageInput {
  title: string;
  description?: string | null;
  cuisine?: string | null;
  ingredients?: { name: string }[];
}

const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

export async function generatePlaceholderImage(
  input: PlaceholderImageInput,
  geminiApiKey: string
): Promise<{ imageBase64: string; mimeType: string }> {
  const ingredientList = (input.ingredients ?? [])
    .slice(0, 10)
    .map((i) => i.name)
    .filter(Boolean)
    .join(", ");

  const prompt = [
    `Photorealistic food photography of "${input.title}"`,
    input.cuisine ? `(${input.cuisine} cuisine).` : ".",
    input.description ? `The dish: ${input.description}.` : "",
    ingredientList ? `Key ingredients: ${ingredientList}.` : "",
    "Overhead or 45-degree angle, natural soft lighting, served in appropriate",
    "tableware on a clean surface. No text, no watermarks, no people, no hands.",
  ]
    .filter(Boolean)
    .join(" ");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(60_000),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Gemini image API error:", res.status, errBody);
    throw new Error(`Image generation returned HTTP ${res.status}`);
  }

  const data = await res.json();
  const parts: { inlineData?: { mimeType?: string; data?: string } }[] =
    data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error("Image generation returned no image data.");
  }
  return {
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}
