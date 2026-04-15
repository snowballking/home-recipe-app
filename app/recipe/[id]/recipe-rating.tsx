"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { StarRating } from "@/app/components/star-rating";

interface RecipeRatingProps {
  recipeId: string;
  avgRating: number;
  ratingCount: number;
}

export function RecipeRating({ recipeId, avgRating, ratingCount }: RecipeRatingProps) {
  const supabase = createClient();
  const [myRating, setMyRating] = useState<number>(0);
  const [avg, setAvg] = useState(avgRating);
  const [count, setCount] = useState(ratingCount);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data } = await supabase
          .from("ratings")
          .select("score")
          .eq("user_id", user.id)
          .eq("recipe_id", recipeId)
          .maybeSingle();

        if (data) setMyRating(data.score);
      } catch {
        // Auth lock race — safe to ignore
      }
    }
    load();
  }, [recipeId]);

  async function handleRate(score: number) {
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    if (myRating > 0) {
      // Update existing rating
      await supabase
        .from("ratings")
        .update({ score, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("recipe_id", recipeId);
    } else {
      // New rating
      await supabase.from("ratings").insert({
        user_id: userId,
        recipe_id: recipeId,
        score,
      });
      setCount((c) => c + 1);
    }

    setMyRating(score);
    // Recalculate approximate avg
    if (myRating > 0) {
      setAvg((prev) => (prev * count - myRating + score) / count);
    } else {
      setAvg((prev) => (prev * count + score) / (count + 1));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <StarRating
        rating={myRating || avg}
        count={count}
        size="md"
        interactive={!!userId}
        onRate={handleRate}
      />
      {myRating > 0 && (
        <span className="text-xs text-indigo-600 dark:text-indigo-400">
          Your rating: {myRating}/5
        </span>
      )}
    </div>
  );
}
