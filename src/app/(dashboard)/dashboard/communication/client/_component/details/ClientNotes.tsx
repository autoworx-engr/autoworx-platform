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
      <h2 className="mt-2 py-3 text-[#797979]">Client Notes</h2>
      <textarea
        className="w-full rounded-md border border-emerald-600 p-2 text-xs text-[#797979]"
        value={notes || ""}
        onChange={handleSaveNote}
        placeholder="Type your notes here..."
      />
    </div>
  );
}
