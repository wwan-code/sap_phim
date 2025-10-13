import { QueryClient } from '@tanstack/react-query';

// Tạo một instance query client global để có thể truy cập từ socket manager
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
