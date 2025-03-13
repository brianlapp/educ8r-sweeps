
import { useCallback, useEffect, useState } from 'react';

// Types for different scheduling strategies
type TaskScheduler = (callback: () => void, options?: any) => number;
type TaskCanceller = (id: number) => void;

interface SchedulerOptions {
  timeout?: number;
  priority?: 'user-blocking' | 'user-visible' | 'background';
}

/**
 * Custom hook for deferring non-critical tasks
 * @param task The function to execute when time allows
 * @param dependencies Dependencies array that triggers the task to be scheduled again
 * @param options Configuration options
 * @returns Object containing execution state and control functions
 */
export function useDeferredTask<T>(
  task: () => Promise<T> | T,
  dependencies: React.DependencyList = [],
  options: {
    timeout?: number;
    executeImmediately?: boolean;
    retryOnError?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const {
    timeout = 5000,
    executeImmediately = false,
    retryOnError = false,
    maxRetries = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
  } = options;

  const [isExecuting, setIsExecuting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [taskId, setTaskId] = useState<number | null>(null);

  // Determine which scheduling API to use
  const getScheduler = useCallback((): [TaskScheduler, TaskCanceller] => {
    // Use requestIdleCallback for low priority tasks when available
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      return [
        (callback, options) => 
          window.requestIdleCallback(callback as IdleRequestCallback, 
            options as IdleRequestOptions),
        window.cancelIdleCallback
      ];
    }
    
    // Fallback to setTimeout
    return [
      (callback, options) => window.setTimeout(callback, options?.timeout || 1),
      window.clearTimeout
    ];
  }, []);

  const executeTask = useCallback(async () => {
    setIsExecuting(true);
    setError(null);
    
    try {
      const taskResult = await task();
      setResult(taskResult);
      setIsCompleted(true);
      onSuccess?.(taskResult);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      
      if (retryOnError && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        const [scheduler] = getScheduler();
        scheduler(() => executeTask(), { timeout: retryDelay });
      }
    } finally {
      setIsExecuting(false);
    }
  }, [task, retryOnError, retryCount, maxRetries, retryDelay, onSuccess, onError]);

  // Polyfill types for IdleCallback
  interface IdleRequestOptions {
    timeout?: number;
  }

  interface IdleDeadline {
    readonly didTimeout: boolean; // Add 'readonly' modifier to fix error
    timeRemaining: () => number;
  }

  type IdleRequestCallback = (deadline: IdleDeadline) => void;

  // Schedule the task execution
  useEffect(() => {
    // Skip scheduling if we're already executing
    if (isExecuting) return;
    
    // Reset states when dependencies change
    setIsCompleted(false);
    setError(null);
    setRetryCount(0);
    
    // Clean up any pending task
    const [scheduler, canceller] = getScheduler();
    if (taskId !== null) {
      canceller(taskId);
    }
    
    // Execute immediately or schedule for later
    if (executeImmediately) {
      executeTask();
    } else {
      const id = scheduler(() => {
        executeTask();
      }, { timeout });
      
      setTaskId(id);
    }
    
    // Cleanup function
    return () => {
      if (taskId !== null) {
        canceller(taskId);
      }
    };
  }, [...dependencies, executeImmediately]);

  return {
    isExecuting,
    isCompleted,
    error,
    result,
    retry: executeTask,
    retryCount
  };
}
