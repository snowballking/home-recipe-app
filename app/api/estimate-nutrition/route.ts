import { NextRequest } from "next/server";

// POST /api/estimate-nutrition
// Accepts: { ingredients: [...], servings: number }
// Returns: { calories_per_serving, protein_grams, carbs_grams, fat_grams }

export async function POST(request: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let body: { ingredients?: { name: string; quantity: string; unit: string }[]; servings?: number };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { ingredients, servings = 1 } = body;
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return Response.json(
      { error: "Please provide an ingredients array." },
      { status: 400 }
    );
  }

  // Format ingredients list for the prompt
  const ingredientsList = ingredients
    .map((i) => `${i.quantity} ${i.unit} ${i.name}`.trim())
    .join("\n");

  const prompt = `You are a nutrition estimation assistant. Given the following recipe ingredients for ${servings} serving(s), estimate the nutritional information PER SERVING.

Ingredients:
${ingredientsList}

Servings: ${servings}

Return ONLY a valid JSON object with these fields:
{
  "calories_per_serving": number,
  "protein_grams": number,
  "carbs_grams": number,
  "fat_grams": number
}

Rules:
- Return ONLY the JSON object, no markdown, no explanation.
- Values should be reasonable estimates based on standard nutritional databases.
- All values are PER SERVING (divide total by ${servings}).
- Round to 1 decimal place.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 256,
            temperature: 0.1,
          },
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Gemini nutrition API error:", res.status, errBody);
      return Response.json(
        { error: `Gemini returned HTTP ${res.status}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const cleaned = rawText
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    const nutrition = JSON.parse(cleaned);

    return Response.json({ nutrition });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Nutrition estimation failed";
    console.error("Nutrition estimation error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
