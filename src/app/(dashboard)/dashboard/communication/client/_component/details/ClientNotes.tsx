"use client";

import { saveNotes } from "@/actions/client/saveNotes";
import { useState } from "react";

type TProps = {
  clientId: number;
  clientNotes: string;
};

export default function ClientNotes({ clientId, clientNotes }: TProps) {
  const [notes, setNotes] = useState(clientNotes);
  const [draft, setDraft] = useState(clientNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 250) {
      setDraft(value);
      setIsDirty(value !== notes);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await saveNotes(clientId, draft);
      setNotes(draft);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(notes);
    setIsDirty(false);
  };

  return (
    <div>
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Client Notes
        </h3>
      </header>

      <textarea
        className="min-h-[96px] max-h-[220px] w-full resize-y overflow-y-auto rounded-md border border-[#006D76] p-2 text-xs text-[#797979]"
        rows={4}
        value={draft || ""}
        onChange={handleChange}
        placeholder="Type your notes here..."
      />

      <div className="mt-1 flex items-center justify-between">
        <div className="text-xs text-zinc-500">{draft?.length || 0}/250</div>

        {isDirty && (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="rounded-md px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="rounded-md bg-[#006D77] px-3 py-1 text-xs text-white hover:bg-[#006D78] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
