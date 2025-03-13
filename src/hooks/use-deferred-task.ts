
import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom interface for the IdleDeadline that includes the didTimeout property
 */
interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
}

/**
 * Options for a deferred task
 */
export interface DeferredTaskOptions {
  timeout?: number;
  signal?: AbortSignal;
}

// Define the global types first, before adding polyfills
declare global {
  interface Window {
    requestIdleCallback: (
      callback: (deadline: IdleDeadline) => void,
      options?: { timeout?: number }
    ) => number;
    cancelIdleCallback: (handle: number) => void;
  }
}

/**
 * Hook that provides a way to defer non-critical tasks
 * @param callback The task to run when the browser is idle
 * @param deps Dependencies array for the callback
 * @param options Options for the deferred task
 * @returns A function to manually trigger the task
 */
export function useDeferredTask<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList = [],
  options: DeferredTaskOptions = {}
) {
  const { timeout = 2000, signal } = options;
  const callbackRef = useRef(callback);

  // Update the callback ref when the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Wrapper function to run the callback
  const runCallback = useCallback(
    (...args: Parameters<T>) => {
      return callbackRef.current(...args);
    },
    [...deps]
  );

  // Schedule the task to run when the browser is idle
  const scheduleTask = useCallback(
    (...args: Parameters<T>) => {
      // Skip if the signal is aborted
      if (signal?.aborted) return;

      // Use requestIdleCallback if available, otherwise use setTimeout
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        const idleCallbackId = window.requestIdleCallback(
          (deadline: IdleDeadline) => {
            // Run the callback if we have time or we timed out
            if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
              runCallback(...args);
            } else {
              // Reschedule if we don't have time
              scheduleTask(...args);
            }
          },
          { timeout }
        );

        // Cancel the task if the signal is aborted
        if (signal) {
          signal.addEventListener('abort', () => {
            window.cancelIdleCallback(idleCallbackId);
          });
        }
      } else {
        // Fallback to setTimeout
        const timeoutId = setTimeout(() => {
          runCallback(...args);
        }, 1);

        // Cancel the task if the signal is aborted
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
          });
        }
      }
    },
    [runCallback, timeout, signal]
  );

  return scheduleTask;
}

// Only add polyfills if needed in browser environments
if (typeof window !== 'undefined') {
  if (!('requestIdleCallback' in window)) {
    (window as Window).requestIdleCallback = function(callback, options) {
      const start = Date.now();
      // Explicitly convert setTimeout's return value to number
      return setTimeout(function() {
        callback({
          didTimeout: false,
          timeRemaining: function() {
            return Math.max(0, 50 - (Date.now() - start));
          }
        });
      }, options?.timeout || 1) as unknown as number; // Cast to number to match the expected type
    };
  }

  if (!('cancelIdleCallback' in window)) {
    (window as Window).cancelIdleCallback = function(id) {
      clearTimeout(id);
    };
  }
}
