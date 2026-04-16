"use client";
import { useState, useEffect, useCallback } from "react";

type UseServerGetWithRefreshResult<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<Error | null>>;
};

export function useServerGetWithRefresh<T>(
  fn: (...args: any) => Promise<T>,
  ...args: any[]
): UseServerGetWithRefreshResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fn(...args);
      setData(result);
    } catch (error) {
      setError(error as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fn, ...args]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh, setData, setLoading, setError };
}
