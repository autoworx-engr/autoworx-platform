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
};

export const usePipelineStagesStore = create<PipelineStagesStore>((set) => ({
  stages: [],
  loading: false,
  error: null,

  fetchStages: async (type) => {
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
      set({ stages: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Unknown error", loading: false });
    }
  },
}));
