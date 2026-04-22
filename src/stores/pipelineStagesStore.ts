import { create } from "zustand";

type Stage = {
  id: number;
  title: string;
};

type PipelineStagesStore = {
  stages: Stage[];
  loading: boolean;
  error: string | null;
  fetchStages: (type: string) => Promise<void>;
  _cache: Record<string, Stage[]>; // cache by type
};

export const usePipelineStagesStore = create<PipelineStagesStore>(
  (set, get) => ({
    stages: [],
    loading: false,
    error: null,
    _cache: {},

    fetchStages: async (type) => {
      const cache = get()._cache;
      if (cache[type]) {
        set({ stages: cache[type], loading: false });
        return;
      }
      set({ loading: true, error: null });
      try {
        const response = await fetch("/api/columns", {
          method: "POST",
          body: JSON.stringify({ type }),
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch pipeline stages.");
        }

        const data = await response.json();
        set((state) => ({
          stages: data,
          loading: false,
          _cache: { ...state._cache, [type]: data },
        }));
      } catch (err: any) {
        set({ error: err.message || "Unknown error", loading: false });
      }
    },
  }),
);
