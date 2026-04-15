"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MealPlanComment, Profile } from "@/lib/types";

interface MealPlanCommentSectionProps {
  mealPlanId: string;
  mealPlanOwnerId: string;
}

export function MealPlanCommentSection({
  mealPlanId,
  mealPlanOwnerId,
}: MealPlanCommentSectionProps) {
  const supabase = createClient();
  const [comments, setComments] = useState<MealPlanComment[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    loadComments();
  }, [mealPlanId]);

  async function loadComments() {
    // Fetch comments
    const { data: commentsData } = await supabase
      .from("meal_plan_comments")
      .select("*")
      .eq("meal_plan_id", mealPlanId)
      .order("created_at", { ascending: true });

    if (!commentsData) return;

    // Build a map of user_ids from comments and replies
    const userIds = new Set<string>();
    commentsData.forEach((comment) => {
      userIds.add(comment.user_id);
    });

    // Fetch profiles for all users
    const profilesList: Profile[] = [];
    for (const uid of userIds) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();
      if (data) {
        profilesList.push(data);
      }
    }

    // Build profiles map
    const newProfilesMap: Record<string, Profile> = {};
    profilesList.forEach((profile) => {
      newProfilesMap[profile.id] = profile;
    });
    setProfilesMap(newProfilesMap);

    // Build comments with replies
    const commentsWithReplies: MealPlanComment[] = [];
    commentsData.forEach((comment) => {
      if (!comment.parent_id) {
        const replies = commentsData.filter((c) => c.parent_id === comment.id);
        commentsWithReplies.push({
          ...comment,
          replies,
        });
      }
    });

    setComments(commentsWithReplies);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !userId) return;
    setLoading(true);

    const { error } = await supabase.from("meal_plan_comments").insert({
      meal_plan_id: mealPlanId,
      user_id: userId,
      body: body.trim(),
      parent_id: replyTo,
    });

    if (!error) {
      setBody("");
      setReplyTo(null);
      loadComments();
    }
    setLoading(false);
  }

  async function handleDelete(commentId: string) {
    // Delete the comment and any replies
    await supabase.from("meal_plan_comments").delete().eq("id", commentId);
    // Also delete any replies to this comment
    await supabase.from("meal_plan_comments").delete().eq("parent_id", commentId);
    loadComments();
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  function CommentItem({
    comment,
    isReply = false,
  }: {
    comment: MealPlanComment;
    isReply?: boolean;
  }) {
    const profile = profilesMap[comment.user_id];
    const displayName = profile?.displayname ?? "Anonymous";
    const initial = (displayName[0] ?? "?").toUpperCase();

    return (
      <div
        className={`${
          isReply
            ? "ml-8 border-l-2 border-zinc-100 pl-4 dark:border-zinc-800"
            : ""
        }`}
      >
        <div className="flex items-start gap-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {displayName}
              </span>
              <span className="text-xs text-zinc-400">
                {timeAgo(comment.created_at)}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
              {comment.body}
            </p>
            <div className="mt-1 flex items-center gap-3">
              {userId && !isReply && (
                <button
                  onClick={() => setReplyTo(comment.id)}
                  className="text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Reply
                </button>
              )}
              {userId === comment.user_id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-xs text-zinc-500 hover:text-red-600"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Replies */}
        {comment.replies?.map((reply) => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}
      </div>
    );
  }

  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length ?? 0),
    0
  );

  return (
    <div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Comments ({totalComments})
      </h3>

      {/* Comment form */}
      {userId ? (
        <form onSubmit={handleSubmit} className="mt-4">
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
              <span>Replying to a comment</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-red-500 hover:text-red-700"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts or suggestions..."
              rows={2}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            <button
              type="submit"
              disabled={!body.trim() || loading}
              className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "..." : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          <a href="/login" className="text-indigo-600 hover:underline">
            Sign in
          </a>{" "}
          to leave a comment.
        </p>
      )}

      {/* Comments list */}
      <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}
