"use client";

import { Spin } from 'antd';
import { useState, useEffect } from 'react';

interface OptimizedLoadingProps {
  loading: boolean;
  minLoadingTime?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Optimized loading component that prevents flash of loading state for fast operations
 * and ensures minimum loading time for better UX
 */
export const OptimizedLoading = ({ 
  loading, 
  minLoadingTime = 300, 
  children, 
  fallback 
}: OptimizedLoadingProps) => {
  const [showLoading, setShowLoading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowLoading(true);
        setStartTime(Date.now());
      }, 150); // Delay showing loading to prevent flash

      return () => clearTimeout(timer);
    } else {
      if (startTime && showLoading) {
        const elapsed = Date.now() - startTime;
        if (elapsed < minLoadingTime) {
          // Ensure minimum loading time for better UX
          setTimeout(() => {
            setShowLoading(false);
            setStartTime(null);
          }, minLoadingTime - elapsed);
        } else {
          setShowLoading(false);
          setStartTime(null);
        }
      } else {
        setShowLoading(false);
        setStartTime(null);
      }
    }
  }, [loading, minLoadingTime, startTime, showLoading]);

  if (showLoading) {
    return fallback || (
      <div className="flex w-full items-center justify-center" style={{ height: "calc(100vh - 300px)" }}>
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
};
