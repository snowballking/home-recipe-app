"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface FollowButtonProps {
  targetUserId: string;
}

export function FollowButton({ targetUserId }: FollowButtonProps) {
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
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId)
          .maybeSingle();

        setIsFollowing(!!data);
      } catch {
        // Auth lock race — safe to ignore
      }
      setLoading(false);
    }
    check();
  }, [targetUserId]);

  async function toggleFollow() {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
      setIsFollowing(false);
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });
      setIsFollowing(true);
    }
    setLoading(false);
  }

  // Don't show follow button for own profile
  if (currentUserId === targetUserId) return null;

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        isFollowing
          ? "border border-zinc-300 bg-white text-zinc-700 hover:border-red-300 hover:text-red-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-700 dark:hover:text-red-400"
          : "bg-indigo-600 text-white hover:bg-indigo-700"
      } disabled:opacity-50`}
    >
      {loading ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
