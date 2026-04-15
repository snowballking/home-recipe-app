"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Comment } from "@/lib/types";

interface CommentSectionProps {
  recipeId: string;
  recipeOwnerId: string;
}

export function CommentSection({ recipeId, recipeOwnerId }: CommentSectionProps) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch(() => { /* auth lock race — safe to ignore */ });
    loadComments();
  }, [recipeId]);

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(displayname, avatar_url)")
      .eq("recipe_id", recipeId)
      .is("parent_id", null)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!data) return;

    // Load replies for each comment
    const commentsWithReplies = await Promise.all(
      data.map(async (comment) => {
        const { data: replies } = await supabase
          .from("comments")
          .select("*, profiles(displayname, avatar_url)")
          .eq("parent_id", comment.id)
          .order("created_at", { ascending: true });
        return { ...comment, replies: replies ?? [] } as Comment;
      })
    );

    setComments(commentsWithReplies);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !userId) return;
    setLoading(true);

    const { error } = await supabase.from("comments").insert({
      recipe_id: recipeId,
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
    await supabase.from("comments").delete().eq("id", commentId);
    loadComments();
  }

  async function handlePin(commentId: string, isPinned: boolean) {
    await supabase
      .from("comments")
      .update({ is_pinned: !isPinned })
      .eq("id", commentId);
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

  function CommentItem({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) {
    return (
      <div className={`${isReply ? "ml-8 border-l-2 border-zinc-100 pl-4 dark:border-zinc-800" : ""}`}>
        <div className="flex items-start gap-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {(comment.profiles?.displayname?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {comment.profiles?.displayname ?? "Anonymous"}
              </span>
              <span className="text-xs text-zinc-400">{timeAgo(comment.created_at)}</span>
              {comment.is_pinned && (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  Pinned
                </span>
              )}
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
              {userId === recipeOwnerId && userId !== comment.user_id && (
                <button
                  onClick={() => handlePin(comment.id, comment.is_pinned)}
                  className="text-xs text-zinc-500 hover:text-amber-600"
                >
                  {comment.is_pinned ? "Unpin" : "Pin"}
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

  return (
    <div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0)})
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
              placeholder="Share your thoughts or tips..."
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
          <a href="/login" className="text-indigo-600 hover:underline">Sign in</a> to leave a comment.
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
