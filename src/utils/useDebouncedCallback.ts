import { useMemo } from "react";
import { debounce } from "@/utils/debounce";

export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
  deps: any[] = []
) {
  return useMemo(() => debounce(callback, delay), deps);
}
