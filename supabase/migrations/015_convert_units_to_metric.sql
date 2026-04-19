-- Migration 015: Convert American/imperial measurement units to metric/UK
-- Converts: oz→grams, lb/lbs→grams/kg, cups→ml, fl oz→ml,
--           quart→ml, pint→ml, stick→grams
-- Renames:  tbsp→tablespoon, tsp→teaspoon, g→grams, gram→grams

-- Helper function to convert a single ingredient unit
CREATE OR REPLACE FUNCTION convert_ingredient_unit(ing jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  unit_lower text;
  qty numeric;
  new_qty numeric;
  new_unit text;
  raw_qty text;
BEGIN
  unit_lower := lower(trim(ing->>'unit'));
  raw_qty := ing->>'quantity';

  -- Try to parse quantity as numeric; if it fails (e.g. "a few", "to taste"), skip conversion
  BEGIN
    qty := raw_qty::numeric;
  EXCEPTION WHEN OTHERS THEN
    qty := NULL;
  END;

  -- Imperial → Metric conversions
  IF unit_lower IN ('oz', 'ounce', 'ounces') AND qty IS NOT NULL THEN
    new_qty := round(qty * 28.35);
    new_unit := 'g';
  ELSIF unit_lower IN ('lb', 'lbs', 'pound', 'pounds') AND qty IS NOT NULL THEN
    IF qty * 453.6 >= 1000 THEN
      new_qty := round(qty * 0.4536 * 100) / 100;
      new_unit := 'kg';
    ELSE
      new_qty := round(qty * 453.6);
      new_unit := 'g';
    END IF;
  ELSIF unit_lower IN ('cup', 'cups') AND qty IS NOT NULL THEN
    new_qty := round(qty * 240);
    new_unit := 'ml';
  ELSIF unit_lower = 'fl oz' AND qty IS NOT NULL THEN
    new_qty := round(qty * 29.57);
    new_unit := 'ml';
  ELSIF unit_lower IN ('quart', 'quarts') AND qty IS NOT NULL THEN
    new_qty := round(qty * 946);
    new_unit := 'ml';
  ELSIF unit_lower IN ('pint', 'pints') AND qty IS NOT NULL THEN
    new_qty := round(qty * 473);
    new_unit := 'ml';
  ELSIF unit_lower IN ('stick', 'sticks') AND qty IS NOT NULL THEN
    new_qty := round(qty * 113);
    new_unit := 'g';
  -- Abbreviation renames (no quantity change)
  ELSIF unit_lower IN ('tbsp', 'tbs', 'tablespoons') THEN
    RETURN jsonb_set(ing, '{unit}', '"tablespoon"');
  ELSIF unit_lower IN ('tsp', 'teaspoons') THEN
    RETURN jsonb_set(ing, '{unit}', '"teaspoon"');
  ELSIF unit_lower IN ('grams', 'gram') THEN
    RETURN jsonb_set(ing, '{unit}', '"g"');
  ELSIF unit_lower IN ('l', 'liter', 'liters', 'litre') THEN
    RETURN jsonb_set(ing, '{unit}', '"litres"');
  ELSE
    -- No conversion needed
    RETURN ing;
  END IF;

  -- Apply conversion
  RETURN jsonb_set(
    jsonb_set(ing, '{quantity}', to_jsonb(new_qty::text)),
    '{unit}', to_jsonb(new_unit)
  );
END;
$$;

-- Helper function to convert an entire ingredients array
CREATE OR REPLACE FUNCTION convert_ingredients_array(ingredients jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  elem jsonb;
BEGIN
  IF ingredients IS NULL THEN RETURN NULL; END IF;
  FOR elem IN SELECT jsonb_array_elements(ingredients)
  LOOP
    result := result || jsonb_build_array(convert_ingredient_unit(elem));
  END LOOP;
  RETURN result;
END;
$$;

-- Convert all recipes
UPDATE public.recipes
SET
  ingredients = convert_ingredients_array(ingredients),
  ingredients_zh = convert_ingredients_array(ingredients_zh)
WHERE
  ingredients IS NOT NULL;

-- Clean up helper functions
DROP FUNCTION IF EXISTS convert_ingredient_unit(jsonb);
DROP FUNCTION IF EXISTS convert_ingredients_array(jsonb);
