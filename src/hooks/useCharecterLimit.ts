import { useMemo } from "react";

export function useCharacterLimit(value: string, maxLength: number) {
  return useMemo(() => {
    const length = value?.length ?? 0;
    // const remaining = maxLength - length;
    const isLimitExceeded = length > maxLength;

    return { length, isLimitExceeded };
  }, [value, maxLength]);
}
