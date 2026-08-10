import { create } from "zustand";

interface DraftPreviewStore {
  previews: Record<string, string>;
  setPreview: (key: string, text: string) => void;
  clearPreview: (key: string) => void;
}

// Live view of in-progress drafts, keyed the same way as localStorage
// (see useMessageDraft's draftKey). localStorage persists drafts across
// reloads; this store exists only so a conversation's list row can show
// "Draft: ..." updating in real time while its compose box is open —
// same-tab localStorage writes don't trigger re-renders anywhere else.
export const useDraftPreviewStore = create<DraftPreviewStore>((set) => ({
  previews: {},
  setPreview: (key, text) =>
    set((state) => ({ previews: { ...state.previews, [key]: text } })),
  // Sets "" rather than deleting the key — a consumer reading
  // `previews[key] ?? fallback` must see a defined "" here, otherwise it
  // falls through to its stale fallback instead of the actual cleared state.
  clearPreview: (key) =>
    set((state) => ({ previews: { ...state.previews, [key]: "" } })),
}));
