export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
) {
  let timeout: ReturnType<typeof setTimeout>;

  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };

  // add cancel method
  (debounced as any).cancel = () => {
    clearTimeout(timeout);
  };

  return debounced as T & { cancel: () => void };
}
