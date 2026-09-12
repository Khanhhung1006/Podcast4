import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15, // 15 minutes fresh cache
      gcTime: 1000 * 60 * 60 * 24, // 24 hours garbage collection
      retry: 1, // Fail fast, never block UI
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

