import { useRef, useCallback, useEffect } from "react";

export function useDebounceCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  (debouncedFn as any).cancel = cancel;

  return debouncedFn as T & { cancel: () => void };
}
