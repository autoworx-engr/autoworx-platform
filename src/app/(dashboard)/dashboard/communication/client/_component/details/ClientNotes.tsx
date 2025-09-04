"use client";

import { saveNotes } from "@/actions/client/saveNotes";
import { useDebounce } from "@/hooks/useDebounce";
import { useState } from "react";

type TProps = {
  clientId: number;
  clientNotes: string;
};

export default function ClientNotes({ clientId, clientNotes }: TProps) {
  const [notes, setNotes] = useState(clientNotes);
  const debouncedSave = useDebounce((noteContent: string) => {
    saveNotes(clientId, noteContent);
  }, 500);

  const handleSaveNote = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    debouncedSave(e.target.value);
    setNotes(e.target.value);
  };
  return (
    <div>
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Client Notes
        </h3>
      </header>
      <textarea
        className="w-full rounded-md border border-emerald-600 p-2 text-xs text-[#797979]"
        value={notes || ""}
        onChange={handleSaveNote}
        placeholder="Type your notes here..."
      />
    </div>
  );
}
