"use client";

import { saveNotes } from "@/actions/client/saveNotes";
import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

type TProps = {
  clientId: number;
  clientNotes: string;
};

const MAX_LEN = 250;

export default function ClientNotes({ clientId, clientNotes }: TProps) {
  const [notes, setNotes] = useState(clientNotes);
  const [draft, setDraft] = useState(clientNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(true);
  const isDirty = draft !== notes;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_LEN) setDraft(value);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await saveNotes(clientId, draft);
      setNotes(draft);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
            NOTES
          </h3>
        </button>
        <ChevronDown
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "h-4 w-4 cursor-pointer text-zinc-400 transition-transform",
            !open && "-rotate-90",
          )}
        />
      </header>

      {open && (
        <div className="mt-3">
          <textarea
            className="w-full resize-none rounded-md border border-zinc-200 bg-white p-2.5 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-[#006D77] focus:outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
            rows={3}
            value={draft || ""}
            onChange={handleChange}
            placeholder="Type your notes here..."
          />

          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Visible only to staff
            </span>
            <div className="flex items-center gap-2">
              {isDirty && (
                <>
                  <button
                    onClick={() => setDraft(notes)}
                    className="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="rounded-md bg-[#006D77] px-2.5 py-1 text-[11px] text-white hover:bg-[#005a63] disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {draft?.length || 0}/{MAX_LEN}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
