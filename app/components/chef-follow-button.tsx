"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ChefFollowButtonProps {
  chefId: string;
  size?: "md" | "lg";
  onToggled?: (nowFollowing: boolean) => void;
}

export function ChefFollowButton({ chefId, size = "md", onToggled }: ChefFollowButtonProps) {
  const supabase = createClient();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        setCurrentUserId(user.id);

        const { data } = await supabase
          .from("chef_follows")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("chef_id", chefId)
          .maybeSingle();

        setIsFollowing(!!data);
      } catch {
        // Auth lock race — safe to ignore
      }
      setLoading(false);
    }
    check();
  }, [chefId]);

  async function toggleFollow() {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);

    if (isFollowing) {
      await supabase
        .from("chef_follows")
        .delete()
        .eq("user_id", currentUserId)
        .eq("chef_id", chefId);
      setIsFollowing(false);
      onToggled?.(false);
    } else {
      await supabase.from("chef_follows").insert({ user_id: currentUserId, chef_id: chefId });
      setIsFollowing(true);
      onToggled?.(true);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`rounded-lg font-medium transition-colors ${
        size === "lg" ? "px-6 py-2 text-base" : "px-4 py-1.5 text-sm"
      } ${
        isFollowing
          ? "border border-zinc-300 bg-white text-zinc-700 hover:border-red-300 hover:text-red-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-700 dark:hover:text-red-400"
          : "bg-indigo-600 text-white hover:bg-indigo-700"
      } disabled:opacity-50`}
    >
      {loading ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
