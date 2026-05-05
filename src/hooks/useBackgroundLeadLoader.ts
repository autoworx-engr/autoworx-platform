"use client";

import { useEffect, useRef, useState } from "react";
import {
  useColumnDispatch,
  useColumnState,
  useSearchTerm,
} from "@/context/sales-pipeline.context";
import { actionTypes } from "@/constants/lead.constant";
import { getColumnRemainingLeads } from "@/actions/pipelines/getSalePipelineColumns";
import { useNavigationCleanup } from "./useNavigationCleanup";

/**
 * Hook to handle background loading of remaining leads for columns that have more leads to load
 * This improves perceived performance by loading initial 10 leads quickly, then loading the rest in background
 * Now with optimizations to prevent blocking navigation and API calls
 */
export const useBackgroundLeadLoader = () => {
  const columns = useColumnState();
  const dispatch = useColumnDispatch();
  const searchTerm = useSearchTerm();
  const { registerCleanup } = useNavigationCleanup();

  // Track which columns have already been processed to prevent infinite loops
  const processedColumnsRef = useRef<Set<number>>(new Set());
  const currentSearchTermRef = useRef<string>(searchTerm);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track user interaction to determine when to start background loading
  const [userInteracted, setUserInteracted] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Register cleanup for navigation
  useEffect(() => {
    const cleanup = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };

    const unregister = registerCleanup(cleanup);
    return unregister;
  }, [registerCleanup]);

  // Listen for user interactions to defer background loading
  useEffect(() => {
    const handleUserInteraction = () => {
      setUserInteracted(true);
    };

    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    // Listen for various user interactions
    const events = ["scroll", "mousemove", "click", "keydown", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, {
        once: true,
        passive: true,
      });
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Auto-trigger after 2 seconds if no interaction
    const autoTrigger = setTimeout(() => {
      setUserInteracted(true);
    }, 2000);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserInteraction);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(autoTrigger);
    };
  }, []);

  useEffect(() => {
    // Cleanup previous operations when dependencies change
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // If search term changed, reset processed columns
    if (currentSearchTermRef.current !== searchTerm) {
      processedColumnsRef.current = new Set();
      currentSearchTermRef.current = searchTerm;
    }

    // Only proceed if user has interacted, page is visible, and there are columns to load
    if (!userInteracted || !isPageVisible) {
      return;
    }

    // Only load background leads if there are columns with more leads to load
    const columnsNeedingBackgroundLoad = columns.filter(
      (column) =>
        column.hasMoreLeads &&
        column.id !== null &&
        !processedColumnsRef.current.has(column.id),
    );

    if (columnsNeedingBackgroundLoad.length === 0) {
      return;
    }

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Load remaining leads for each column in background with proper throttling
    const loadBackgroundLeads = async () => {
      try {
        // Process columns one at a time to prevent overwhelming the server
        for (const column of columnsNeedingBackgroundLoad) {
          if (signal.aborted || !column.id) continue;

          // Mark this column as being processed
          processedColumnsRef.current.add(column.id);

          try {
            const remainingLeads = await getColumnRemainingLeads(
              column.id,
              searchTerm,
              10, // Skip the first 10 leads that were already loaded
            );

            // Check if still valid before dispatching
            if (!signal.aborted) {
              dispatch({
                type: actionTypes.MERGE_BACKGROUND_LEADS,
                payload: {
                  columnId: column.id,
                  leads: remainingLeads,
                },
              });
            }

            // Add a small delay between column processing to prevent blocking
            if (
              !signal.aborted &&
              columnsNeedingBackgroundLoad.indexOf(column) <
                columnsNeedingBackgroundLoad.length - 1
            ) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          } catch (error) {
            if (!signal.aborted) {
              console.error(
                `Failed to load background leads for column ${column.id}:`,
                error,
              );
              // Remove from processed set on error so it can be retried
              processedColumnsRef.current.delete(column.id);
            }
          }
        }
      } catch (error) {
        if (!signal.aborted) {
          console.error("Background lead loading failed:", error);
        }
      }
    };

    // Use requestIdleCallback if available, otherwise fallback to setTimeout with longer delay
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(
        () => {
          if (!signal.aborted) {
            loadBackgroundLeads();
          }
        },
        { timeout: 1000 },
      );
    } else {
      // Increase delay to ensure initial render and navigation are complete
      loadingTimeoutRef.current = setTimeout(() => {
        if (!signal.aborted) {
          loadBackgroundLeads();
        }
      }, 1000);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [columns, dispatch, searchTerm, userInteracted, isPageVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);
};
