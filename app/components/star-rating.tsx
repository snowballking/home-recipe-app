"use client";

import { useState } from "react";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (score: number) => void;
}

export function StarRating({
  rating,
  count,
  size = "md",
  interactive = false,
  onRate,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || rating;

  const sizeClass = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  }[size];

  return (
    <div className="flex items-center gap-1">
      <div
        className={`flex ${interactive ? "cursor-pointer" : ""}`}
        onMouseLeave={() => interactive && setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${sizeClass} transition-colors ${
              star <= display
                ? "text-amber-400"
                : "text-zinc-300 dark:text-zinc-600"
            } ${interactive ? "hover:scale-110" : ""}`}
            onMouseEnter={() => interactive && setHovered(star)}
            onClick={() => interactive && onRate?.(star)}
          >
            ★
          </span>
        ))}
      </div>
      {typeof count === "number" && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {rating > 0 ? rating.toFixed(1) : "—"} ({count})
        </span>
      )}
    </div>
  );
}
