import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const useAutoRefreshRoute = (ms: number = 5000) => {
  const router = useRouter();
  useEffect(() => {
    const intervalId = setInterval(() => {
      router.refresh();
    }, ms);
    return () => {
      clearInterval(intervalId); // unmount to clear interval
    };
  }, [router]);
};
