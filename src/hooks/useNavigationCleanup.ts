"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Hook to handle cleanup when navigating away from a page
 * Returns a cleanup function that can be called to cancel ongoing operations
 */
export const useNavigationCleanup = () => {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const cleanupFunctionsRef = useRef<Set<() => void>>(new Set());

  // Register a cleanup function
  const registerCleanup = (cleanupFn: () => void) => {
    cleanupFunctionsRef.current.add(cleanupFn);

    // Return a function to unregister the cleanup
    return () => {
      cleanupFunctionsRef.current.delete(cleanupFn);
    };
  };

  // Run cleanup when pathname changes
  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      // Call all registered cleanup functions
      cleanupFunctionsRef.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.error("Error during cleanup:", error);
        }
      });

      // Clear the cleanup functions after navigation
      cleanupFunctionsRef.current.clear();
      previousPathnameRef.current = pathname;
    }
  }, [pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupFunctionsRef.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.error("Error during unmount cleanup:", error);
        }
      });
      cleanupFunctionsRef.current.clear();
    };
  }, []);

  return { registerCleanup };
};
