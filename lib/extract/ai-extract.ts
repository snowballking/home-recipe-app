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
  "category": "string — one of: breakfast, appetizers, soups, salads, meat_seafood, vegetables, noodles_rice, snacks, desserts, drinks — pick the BEST fit for the dish type",
  "dietary_tags": ["from: Vegetarian, Vegan, Halal, Gluten-Free, Keto, Low-Carb, Dairy-Free, Nut-Free, Paleo, Whole30"],
  "calories_per_serving": number or null,
  "protein_grams": number or null,
  "carbs_grams": number or null,
  "fat_grams": number or null,

  "title_zh": "string — Simplified Chinese translation of the title",
  "description_zh": "string — Simplified Chinese translation of the description",
  "ingredients_zh": [{"name": "string (Chinese)", "quantity": "string", "unit": "string (Chinese)"}],
  "steps_zh": ["string — each cooking step in Simplified Chinese"],
  "important_note_zh": "string or null — Simplified Chinese translation of any important note"
}`;

const EXTRACTION_RULES = `Rules:
- Return ONLY the JSON object, no markdown, no explanation, no wrapping.
- If a value cannot be determined, use null or empty string/array.
- For ingredients, separate quantity, unit, and name. E.g. "200 g flour" → {"quantity":"200","unit":"g","name":"flour"}.
- If nutritional info is missing, estimate calories_per_serving from the ingredients and portions.
- Infer difficulty from complexity of steps and number of ingredients.
- Infer cuisine from the dish name and ingredients if not stated.
- If content is in a non-English language, translate the recipe to English for the main fields.
- ALWAYS provide Simplified Chinese translations in the _zh fields (title_zh, description_zh, ingredients_zh, steps_zh, important_note_zh), regardless of the source language. Translate from English or the original language to Simplified Chinese.
- For ingredients_zh, keep quantity the same but translate name and unit to Chinese. E.g. {"quantity":"200","unit":"克","name":"面粉"}.
- For steps_zh, translate each step to natural Simplified Chinese.

IMPORTANT — Measurement units (MUST follow):
- ALWAYS use metric / UK measurement units. Convert any American / imperial units:
  - oz (ounces) → convert to g (multiply by 28.35, round to nearest whole number)
  - lb / lbs / pounds → convert to kg (or g if under 1 kg)
  - cups → convert to ml (1 cup = 240 ml) or g for dry ingredients
  - fl oz → convert to ml (multiply by 29.57, round)
  - fahrenheit → convert to celsius
  - quart → convert to litres or ml
  - pint → convert to ml (1 US pint = 473 ml)
  - stick (butter) → convert to g (1 stick = 113 g)
- Use the FULL word for these abbreviations: "tbsp" → "tablespoon", "tsp" → "teaspoon"
- Use "g" (not "grams") for grams
- Keep these units as-is: g, kg, ml, litres, tablespoon, teaspoon, pieces, cloves, slices, bunch, pinch, to taste

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
      max_tokens: 4096,
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

// ── Unit normalisation (imperial → metric / UK) ─────────────────
// Applied as a safety net after AI extraction, in case the AI
// returns abbreviated or imperial units despite the prompt rules.

interface IngredientLike {
  name: string;
  quantity: string;
  unit: string;
}

const UNIT_CONVERSIONS: Record<string, (qty: number) => { quantity: number; unit: string }> = {
  oz:      (q) => ({ quantity: Math.round(q * 28.35), unit: "g" }),
  ounce:   (q) => ({ quantity: Math.round(q * 28.35), unit: "g" }),
  ounces:  (q) => ({ quantity: Math.round(q * 28.35), unit: "g" }),
  lb:      (q) => q * 453.6 >= 1000 ? { quantity: Math.round(q * 0.4536 * 100) / 100, unit: "kg" } : { quantity: Math.round(q * 453.6), unit: "g" },
  lbs:     (q) => q * 453.6 >= 1000 ? { quantity: Math.round(q * 0.4536 * 100) / 100, unit: "kg" } : { quantity: Math.round(q * 453.6), unit: "g" },
  pound:   (q) => q * 453.6 >= 1000 ? { quantity: Math.round(q * 0.4536 * 100) / 100, unit: "kg" } : { quantity: Math.round(q * 453.6), unit: "g" },
  pounds:  (q) => q * 453.6 >= 1000 ? { quantity: Math.round(q * 0.4536 * 100) / 100, unit: "kg" } : { quantity: Math.round(q * 453.6), unit: "g" },
  cup:     (q) => ({ quantity: Math.round(q * 240), unit: "ml" }),
  cups:    (q) => ({ quantity: Math.round(q * 240), unit: "ml" }),
  "fl oz": (q) => ({ quantity: Math.round(q * 29.57), unit: "ml" }),
  quart:   (q) => ({ quantity: Math.round(q * 946), unit: "ml" }),
  quarts:  (q) => ({ quantity: Math.round(q * 946), unit: "ml" }),
  pint:    (q) => ({ quantity: Math.round(q * 473), unit: "ml" }),
  pints:   (q) => ({ quantity: Math.round(q * 473), unit: "ml" }),
  stick:   (q) => ({ quantity: Math.round(q * 113), unit: "g" }),
  sticks:  (q) => ({ quantity: Math.round(q * 113), unit: "g" }),
};

const UNIT_RENAMES: Record<string, string> = {
  tbsp: "tablespoon",
  tbs: "tablespoon",
  tablespoons: "tablespoon",
  tsp: "teaspoon",
  teaspoons: "teaspoon",
  grams: "g",
  gram: "g",
  kg: "kg",
  ml: "ml",
  l: "litres",
  liter: "litres",
  liters: "litres",
  litre: "litres",
};

export function normaliseIngredientUnits(ingredients: IngredientLike[]): IngredientLike[] {
  return ingredients.map((ing) => {
    const unitLower = (ing.unit ?? "").trim().toLowerCase();
    const qty = parseFloat(ing.quantity);

    // Check for imperial → metric conversion
    const converter = UNIT_CONVERSIONS[unitLower];
    if (converter && !isNaN(qty)) {
      const converted = converter(qty);
      return { ...ing, quantity: String(converted.quantity), unit: converted.unit };
    }

    // Check for abbreviation → full name rename
    const renamed = UNIT_RENAMES[unitLower];
    if (renamed) {
      return { ...ing, unit: renamed };
    }

    return ing;
  });
}
