
import { useCallback, useEffect, useRef } from 'react';

type DeferredTaskOptions = {
  timeout?: number;
  onError?: (error: unknown) => void;
};

/**
 * Hook for running non-critical tasks during browser idle time
 */
export function useDeferredTask<T>(
  task: () => Promise<T> | T,
  options: DeferredTaskOptions = {}
) {
  const { timeout = 5000, onError } = options;
  const taskRef = useRef(task);
  const resultRef = useRef<T | null>(null);
  const hasRunRef = useRef(false);

  // Update task ref if the function changes
  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  // Run the task during idle time
  useEffect(() => {
    if (hasRunRef.current) return;

    const runTask = async () => {
      try {
        const result = await taskRef.current();
        resultRef.current = result;
        hasRunRef.current = true;
      } catch (error) {
        onError?.(error);
        console.error('Error in deferred task:', error);
      }
    };

    if (typeof window.requestIdleCallback === 'function') {
      // Use requestIdleCallback when available
      const idleId = window.requestIdleCallback(
        () => {
          runTask();
        },
        { timeout }
      );

      return () => window.cancelIdleCallback(idleId);
    } else {
      // Fallback to setTimeout
      const timeoutId = setTimeout(() => {
        runTask();
      }, 200); // Small delay to not block initial render

      return () => clearTimeout(timeoutId);
    }
  }, [timeout, onError]);

  // Force run the task immediately if needed
  const forceRun = useCallback(async () => {
    try {
      const result = await taskRef.current();
      resultRef.current = result;
      hasRunRef.current = true;
      return result;
    } catch (error) {
      onError?.(error);
      console.error('Error in forced deferred task:', error);
      throw error;
    }
  }, [onError]);

  return {
    result: resultRef.current,
    hasRun: hasRunRef.current,
    forceRun
  };
}

// Add types for requestIdleCallback
declare global {
  interface Window {
    requestIdleCallback: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback: (handle: number) => void;
  }

  interface IdleRequestCallback {
    (deadline: IdleDeadline): void;
  }

  interface IdleDeadline {
    didTimeout: boolean;
    timeRemaining: () => number;
  }

  interface IdleRequestOptions {
    timeout?: number;
  }
}
