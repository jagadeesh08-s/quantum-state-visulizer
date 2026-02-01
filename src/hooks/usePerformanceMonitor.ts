import { useEffect, useRef, useCallback } from 'react';

// Extend window interface for Google Analytics
declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: any) => void;
  }
}

// Performance monitoring hook for tracking component render times and API calls
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>();
  const apiCallStartTime = useRef<number>();
  const renderCount = useRef(0);

  // Track component render performance
  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;

    return () => {
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;

        // Log slow renders (>16ms for 60fps)
        if (renderTime > 16) {
          console.warn(`[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
        }

        // Send to analytics if available
        if (window.gtag) {
          window.gtag('event', 'component_render', {
            component_name: componentName,
            render_time: renderTime,
            render_count: renderCount.current
          });
        }
      }
    };
  });

  // API call performance tracking
  const trackApiCall = useCallback((apiName: string, startTime?: number) => {
    if (startTime) {
      apiCallStartTime.current = startTime;
    } else {
      apiCallStartTime.current = performance.now();
    }

    return () => {
      if (apiCallStartTime.current) {
        const apiTime = performance.now() - apiCallStartTime.current;

        // Log slow API calls (>500ms)
        if (apiTime > 500) {
          console.warn(`[Performance] ${componentName} slow API call ${apiName}: ${apiTime.toFixed(2)}ms`);
        }

        // Send to analytics
        if (window.gtag) {
          window.gtag('event', 'api_call', {
            api_name: apiName,
            response_time: apiTime,
            component: componentName
          });
        }
      }
    };
  }, [componentName]);

  // Memory usage tracking (if available)
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      return {
        used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
        total: Math.round(mem.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }, []);

  // Track memory usage periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const memory = getMemoryUsage();
      if (memory && memory.used > 50) { // Alert if >50MB
        console.warn(`[Performance] ${componentName} high memory usage: ${memory.used}MB used`);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [componentName, getMemoryUsage]);

  return {
    trackApiCall,
    getMemoryUsage,
    renderCount: renderCount.current
  };
};

// Global performance utilities
export const performanceUtils = {
  // Measure function execution time
  measureExecutionTime: <T>(fn: () => T, label: string): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  },

  // Debounce function for performance
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for performance
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};