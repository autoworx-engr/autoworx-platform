"use client";

import { useState } from "react";
import { X, Star } from "lucide-react";
import toast from "react-hot-toast";
import type { GbpReviewRow } from "../types";

interface Props {
  review: GbpReviewRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ReplyModal({ review, onClose, onSaved }: Props) {
  const [text, setText] = useState(review?.replyText ?? "");
  const [saving, setSaving] = useState(false);

  if (!review) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/gbp/reviews/${review!.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to post reply");
      toast.success(
        review!.replyText
          ? "Reply updated successfully"
          : "Reply posted successfully",
      );
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post reply");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b p-5 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {review.replyText ? "Edit Reply" : "Reply to Review"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-slate-700">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                {review.authorName}
              </span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    className={
                      s <= review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
            </div>
            {review.comment && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {review.comment}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a professional, helpful response..."
              rows={5}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6571FF] dark:border-gray-600 dark:bg-slate-900 dark:text-white"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !text.trim()}
                className="rounded-md bg-[#6571FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5560ee] disabled:opacity-50 transition-colors"
              >
                {saving
                  ? "Posting..."
                  : review.replyText
                    ? "Update Reply"
                    : "Post Reply"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
