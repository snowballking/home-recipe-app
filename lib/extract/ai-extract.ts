// Shared AI extraction logic.
// - YouTube video → Gemini 2.5 Flash Lite (video understanding)
// - Text-based content (websites, RedNote, Instagram) → Claude Haiku 4.5

const RECIPE_SCHEMA = `{
  "title": "string",
  "description": "string — 1-2 sentence description",
  "ingredients": [{"name": "string", "quantity": "string", "unit": "string"}],
  "steps": ["string — each cooking step"],
  "servings": number,
  "prep_time": number or null (minutes),
  "cook_time": number or null (minutes),
  "difficulty": "beginner" | "intermediate" | "advanced",
  "cuisine": "string — one of: Chinese, Malay, Indian, Western, Japanese, Korean, Thai, Vietnamese, Italian, Mexican, Middle Eastern, French, American, Mediterranean, Other, or empty",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack" | "dessert" | "drinks" | "",
  "category": "string — one of: breakfast, appetizers, soups, salads, meat, seafood, vegetables, noodles_rice, snacks, desserts, drinks — pick the BEST fit for the dish type",
  "dietary_tags": ["from: Vegetarian, Vegan, Halal, Gluten-Free, Keto, Low-Carb, Dairy-Free, Nut-Free, Paleo, Whole30"],
  "calories_per_serving": number or null,
  "protein_grams": number or null,
  "carbs_grams": number or null,
  "fat_grams": number or null
}`;

const EXTRACTION_RULES = `Rules:
- Return ONLY the JSON object, no markdown, no explanation, no wrapping.
- If a value cannot be determined, use null or empty string/array.
- For ingredients, separate quantity, unit, and name. E.g. "2 cups flour" → {"quantity":"2","unit":"cups","name":"flour"}.
- If nutritional info is missing, estimate calories_per_serving from the ingredients and portions.
- Infer difficulty from complexity of steps and number of ingredients.
- Infer cuisine from the dish name and ingredients if not stated.
- If content is in a non-English language, translate the recipe to English.

IMPORTANT — Copyright compliance:
- For the "steps" array: REWRITE every cooking instruction in your own words. Do NOT copy the original wording verbatim. Convey the same technique and outcome using different sentence structure and phrasing.
- For the "description" field: Write an ORIGINAL 1-2 sentence summary of the dish in your own words. Do not copy the source description.
- For "title": Use the common/standard name of the dish. Do not copy creative or trademarked recipe titles (e.g. instead of "Grandma Betty's Amazing Sunday Pot Roast" just use "Sunday Pot Roast").
- Ingredient lists (names, quantities, units) are factual data and can be extracted as-is.`;

// ── Claude Haiku 4.5 — for text-based extraction ─────────────────

export async function extractWithHaiku(
  text: string,
  anthropicApiKey: string
): Promise<Record<string, unknown>> {
  const prompt = `You are a recipe extraction assistant. Extract the recipe details from the following text and return ONLY a valid JSON object:\n\n${RECIPE_SCHEMA}\n\n${EXTRACTION_RULES}\n\nHere is the content:\n"""\n${text}\n"""`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Haiku API error:", res.status, errBody);
    throw new Error(`Claude Haiku returned HTTP ${res.status}`);
  }

  const data = await res.json();
  const rawText: string = data?.content?.[0]?.text ?? "";
  return parseJsonResponse(rawText);
}

// ── Gemini 2.5 Flash Lite — YouTube video understanding ─────────
// Gemini can process YouTube videos natively via fileData.
// It watches the video (visual frames + audio), identifies ingredients,
// reads on-screen text, and extracts the full recipe.

export async function extractFromYouTubeVideo(
  youtubeUrl: string,
  geminiApiKey: string
): Promise<Record<string, unknown>> {
  const prompt = `You are a recipe extraction assistant. Watch this entire cooking video carefully.
Pay close attention to:
- On-screen text showing ingredients, measurements, and steps
- Ingredients shown visually during preparation
- Spoken instructions and quantities mentioned in the audio
- The final dish to determine the recipe title

Extract the complete recipe and return ONLY a valid JSON object:

${RECIPE_SCHEMA}

${EXTRACTION_RULES}

Additional video-specific rules:
- Watch the ENTIRE video before extracting — ingredients and steps may appear at any point.
- If ingredients are shown on screen with measurements, use those exact measurements.
- If the creator speaks in a non-English language, translate everything to English.
- Estimate prep_time and cook_time from the video timestamps if possible.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                file_data: {
                  mime_type: "video/*",
                  file_uri: youtubeUrl,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.1,
        },
      }),
      // Video processing takes longer — allow up to 90 seconds
      signal: AbortSignal.timeout(90_000),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Gemini video API error:", res.status, errBody);
    throw new Error(`Gemini video extraction returned HTTP ${res.status}`);
  }

  const data = await res.json();
  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseJsonResponse(rawText);
}

// ── Shared JSON parser ───────────────────────────────────────────

function parseJsonResponse(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(cleaned);
}
