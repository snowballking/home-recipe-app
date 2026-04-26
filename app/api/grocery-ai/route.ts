import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/grocery-ai
// Sends raw ingredient list to Gemini AI for smart consolidation.
// Returns a clean, deduplicated grocery list with normalized units.

interface RawIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const body = await request.json();
  const ingredients: RawIngredient[] = body.ingredients ?? [];

  if (ingredients.length === 0) {
    return Response.json({ items: [] });
  }

  // Build a readable list for the prompt
  const ingredientLines = ingredients.map(
    (ing, i) => `${i + 1}. ${ing.quantity} ${ing.unit} ${ing.name}`
  ).join("\n");

  const prompt = `You are a grocery shopping assistant. I have a list of ingredients from multiple recipes in a meal plan. Many items are duplicated with different units or slight name variations.

Please consolidate this into a clean grocery shopping list:
1. Merge duplicate ingredients (e.g., "garlic 3 cloves" + "garlic 2 tsp minced" = one garlic entry with a sensible combined quantity)
2. Normalize units to practical shopping units (e.g., use "pcs" for whole items, "g" or "kg" for weight, "ml" or "L" for liquids, "tbsp"/"tsp" for small amounts of spices/sauces)
3. Categorize each item into exactly one of these categories: produce, dairy, meat, seafood, bakery, frozen, canned, condiments, spices, grains, snacks, beverages, other
4. Clean up ingredient names (capitalize properly, remove redundant words)
5. Round quantities to practical amounts (no one buys 2.33 onions — round to 3)

Here are the raw ingredients:
${ingredientLines}

Respond with ONLY a valid JSON array, no markdown, no explanation. Each item must have exactly these fields:
[
  { "name": "Ingredient Name", "quantity": "2", "unit": "pcs", "category": "produce" }
]

Important rules:
- category MUST be one of: produce, dairy, meat, seafood, bakery, frozen, canned, condiments, spices, grains, snacks, beverages, other
- quantity must be a number as string (e.g., "2", "0.5", "500")
- Keep the list practical for a real shopping trip
- Combine ALL duplicates — the final list should have each ingredient appear only ONCE`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[grocery-ai] Gemini API error:", geminiRes.status, errText);
      return Response.json({ error: "Gemini API error: " + geminiRes.status }, { status: 502 });
    }

    const geminiData = await geminiRes.json();

    // Extract text from Gemini response
    const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      console.error("[grocery-ai] No text in Gemini response:", JSON.stringify(geminiData));
      return Response.json({ error: "No response from Gemini" }, { status: 502 });
    }

    // Parse JSON from response (strip markdown code fences if present)
    let jsonStr = textContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const items = JSON.parse(jsonStr);

    // Validate structure
    const validCategories = new Set([
      "produce", "dairy", "meat", "seafood", "bakery", "frozen",
      "canned", "condiments", "spices", "grains", "snacks", "beverages", "other",
    ]);

    const validated = items.map((item: any) => ({
      name: String(item.name ?? "Unknown"),
      quantity: String(item.quantity ?? "1"),
      unit: String(item.unit ?? "pcs"),
      category: validCategories.has(item.category) ? item.category : "other",
    }));

    return Response.json({ items: validated });
  } catch (err: any) {
    console.error("[grocery-ai] Error:", err);
    return Response.json({ error: "AI processing failed: " + err.message }, { status: 500 });
  }
}
