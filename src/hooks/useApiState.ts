import { useState, useCallback } from 'react';
import { ApiState, ApiStatus, createApiState } from '@/components/ui/api-state';

interface UseApiStateOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useApiState<T = unknown>(options?: UseApiStateOptions) {
  const [state, setState] = useState<ApiState<T>>(createApiState<T>());

  const setLoading = useCallback(() => {
    setState({
      status: 'loading',
      data: null,
      error: null,
    });
  }, []);

  const setSuccess = useCallback((data: T) => {
    setState({
      status: 'success',
      data,
      error: null,
    });
    options?.onSuccess?.(data);
  }, [options]);

  const setError = useCallback((error: string | Error) => {
    const errorMessage = error instanceof Error ? error.message : error;
    setState({
      status: 'error',
      data: null,
      error: errorMessage,
    });
    options?.onError?.(errorMessage);
  }, [options]);

  const reset = useCallback(() => {
    setState(createApiState<T>());
  }, []);

  const execute = useCallback(async <R = T>(
    asyncFn: () => Promise<R>,
    transform?: (result: R) => T
  ): Promise<R | null> => {
    setLoading();
    try {
      const result = await asyncFn();
      const data = transform ? transform(result) : (result as unknown as T);
      setSuccess(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    }
  }, [setLoading, setSuccess, setError]);

  return {
    state,
    isIdle: state.status === 'idle',
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    data: state.data,
    error: state.error,
    setLoading,
    setSuccess,
    setError,
    reset,
    execute,
  };
}

// Specialized hook for paginated data
export function usePaginatedApiState<T = unknown>() {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const api = useApiState<T[]>();

  const loadMore = useCallback(async (
    fetchFn: (page: number) => Promise<T[]>,
    pageSize = 20
  ) => {
    const result = await api.execute(() => fetchFn(page));
    if (result) {
      setItems((prev) => [...prev, ...result]);
      setHasMore(result.length >= pageSize);
      setPage((prev) => prev + 1);
    }
    return result;
  }, [api, page]);

  const refresh = useCallback(async (
    fetchFn: (page: number) => Promise<T[]>
  ) => {
    setPage(1);
    setItems([]);
    setHasMore(true);
    const result = await api.execute(() => fetchFn(1));
    if (result) {
      setItems(result);
    }
    return result;
  }, [api]);

  return {
    ...api,
    items,
    hasMore,
    page,
    loadMore,
    refresh,
  };
}

// Hook for multiple concurrent API calls
export function useMultiApiState() {
  const [states, setStates] = useState<Record<string, ApiState<unknown>>>({});

  const getState = useCallback((key: string): ApiState<unknown> => {
    return states[key] || createApiState();
  }, [states]);

  const execute = useCallback(async <T>(
    key: string,
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    setStates((prev) => ({
      ...prev,
      [key]: { status: 'loading', data: null, error: null },
    }));

    try {
      const result = await asyncFn();
      setStates((prev) => ({
        ...prev,
        [key]: { status: 'success', data: result, error: null },
      }));
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setStates((prev) => ({
        ...prev,
        [key]: { status: 'error', data: null, error: errorMessage },
      }));
      return null;
    }
  }, []);

  const reset = useCallback((key?: string) => {
    if (key) {
      setStates((prev) => ({
        ...prev,
        [key]: createApiState(),
      }));
    } else {
      setStates({});
    }
  }, []);

  const isAnyLoading = Object.values(states).some((s) => s.status === 'loading');
  const hasAnyError = Object.values(states).some((s) => s.status === 'error');

  return {
    states,
    getState,
    execute,
    reset,
    isAnyLoading,
    hasAnyError,
  };
}
