import { newSource } from "@/actions/source/newSource";
import { DEFAULT_CLIENT_SOURCE_NAMES } from "@/lib/consts";
import { useFormErrorStore } from "@/stores/form-error";
import { Source } from "@prisma/client";
import { useMemo, useState } from "react";

/**
 * Shared behind the "Client Source" dropdown in both the Add Client and Edit
 * Client modals: merges the company's saved sources with any Lead-form
 * defaults not yet saved (shown as negative-id placeholders), and persists a
 * default the moment it's picked so `sourceId` is always a real FK.
 */
export function useClientSourcePicker({
  sources,
  setSources,
  setClientSource,
}: {
  sources: Source[];
  setSources: (updater: (prev: Source[]) => Source[]) => void;
  setClientSource: (source: Source) => void;
}) {
  const [isCreatingSource, setIsCreatingSource] = useState(false);
  const { showError } = useFormErrorStore();

  const displaySources = useMemo(() => {
    const existingNames = new Set(sources.map((source) => source.name));
    const defaults = DEFAULT_CLIENT_SOURCE_NAMES.filter(
      (name) => !existingNames.has(name),
    ).map((name, index) => ({ id: -(index + 1), name }) as Source);

    return [...sources, ...defaults];
  }, [sources]);

  async function selectClientSource(source: Source) {
    if (source.id >= 0) {
      setClientSource(source);
      return;
    }

    if (isCreatingSource) return;
    setIsCreatingSource(true);
    try {
      const res = await newSource(source.name);
      if (res.type === "success") {
        setSources((prev) => [...prev, res.data]);
        setClientSource(res.data);
      } else {
        showError({
          message: res.message || "Failed to add client source.",
        });
      }
    } finally {
      setIsCreatingSource(false);
    }
  }

  return {
    displaySources,
    isCreatingSource,
    selectClientSource,
    resetCreatingSource: () => setIsCreatingSource(false),
  };
}
