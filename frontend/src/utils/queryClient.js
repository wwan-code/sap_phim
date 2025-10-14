import { QueryClient } from '@tanstack/react-query';

// Custom error handler
const handleQueryError = (error) => {
  console.error('React Query Error:', error);
  
  // You can add custom error handling here
  // For example, show toast notification for certain errors
  if (error?.response?.status === 401) {
    // Handle unauthorized errors
    console.warn('Unauthorized request detected');
  }
};

// Custom retry logic
const shouldRetry = (failureCount, error) => {
  // Don't retry on 4xx errors (client errors)
  if (error?.response?.status >= 400 && error?.response?.status < 500) {
    return false;
  }
  
  // Retry up to 3 times for other errors
  return failureCount < 3;
};

// Custom retry delay with exponential backoff
const getRetryDelay = (attemptIndex) => {
  return Math.min(1000 * 2 ** attemptIndex, 30000); // Max 30 seconds
};

/**
 * Enhanced Query Client with optimized defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache times
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection (formerly cacheTime)
      
      // Retry configuration
      retry: shouldRetry,
      retryDelay: getRetryDelay,
      
      // Refetch configuration
      refetchOnWindowFocus: false, // Disable auto-refetch on window focus (can be enabled per query)
      refetchOnReconnect: true, // Refetch when reconnecting
      refetchOnMount: true, // Refetch on component mount if data is stale
      
      // Network mode
      networkMode: 'online', // Only run queries when online
      
      // Error handling
      throwOnError: false, // Don't throw errors, handle them gracefully
      onError: handleQueryError,
      
      // Keep previous data while fetching new data
      placeholderData: (previousData) => previousData,
    },
    
    mutations: {
      // Retry configuration for mutations
      retry: 1, // Retry failed mutations once
      retryDelay: 1000,
      
      // Network mode
      networkMode: 'online',
      
      // Error handling
      throwOnError: false,
      onError: handleQueryError,
    },
  },
});

/**
 * Query key factories for better organization and type safety
 */
export const queryKeys = {
  // Notifications
  notifications: {
    all: ['notifications'],
    lists: () => [...queryKeys.notifications.all, 'list'],
    list: (filters) => [...queryKeys.notifications.lists(), filters],
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'],
  },
  
  // Comments
  comments: {
    all: ['comments'],
    list: (contentType, contentId, sort) => [...queryKeys.comments.all, contentType, contentId, sort],
    movieWithEpisodes: (movieId, sort) => ['movieCommentsWithEpisodes', movieId, sort],
    replies: (parentId, sort) => ['replies', parentId, sort],
    reported: (filters) => ['reportedComments', filters],
    stats: (filters) => ['commentStatsAdmin', filters],
  },
  
  // Friends
  friends: {
    all: ['friends'],
    list: () => [...queryKeys.friends.all, 'list'],
    pending: () => [...queryKeys.friends.all, 'pending'],
    sent: () => [...queryKeys.friends.all, 'sent'],
    search: (query) => [...queryKeys.friends.all, 'search', query],
  },
  
  // Movies
  movies: {
    all: ['movies'],
    detail: (id) => [...queryKeys.movies.all, 'detail', id],
    list: (filters) => [...queryKeys.movies.all, 'list', filters],
  },
};

/**
 * Utility functions for cache management
 */
export const cacheUtils = {
  /**
   * Invalidate multiple query keys at once
   */
  invalidateMultiple: async (keys) => {
    await Promise.all(
      keys.map(key => queryClient.invalidateQueries({ queryKey: key }))
    );
  },
  
  /**
   * Prefetch data for better UX
   */
  prefetch: async (queryKey, queryFn, options = {}) => {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: options.staleTime || 5 * 60 * 1000,
    });
  },
  
  /**
   * Set query data manually
   */
  setData: (queryKey, data) => {
    queryClient.setQueryData(queryKey, data);
  },
  
  /**
   * Get cached query data
   */
  getData: (queryKey) => {
    return queryClient.getQueryData(queryKey);
  },
  
  /**
   * Clear all cache
   */
  clearAll: () => {
    queryClient.clear();
  },
  
  /**
   * Remove specific queries
   */
  remove: (queryKey) => {
    queryClient.removeQueries({ queryKey });
  },
  
  /**
   * Cancel queries
   */
  cancel: async (queryKey) => {
    await queryClient.cancelQueries({ queryKey });
  },
  
  /**
   * Reset queries to initial state
   */
  reset: async (queryKey) => {
    await queryClient.resetQueries({ queryKey });
  },
  
  /**
   * Optimistic update helper
   */
  optimisticUpdate: async (queryKey, updater, mutationFn) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey });
    
    // Snapshot the previous value
    const previousData = queryClient.getQueryData(queryKey);
    
    // Optimistically update
    queryClient.setQueryData(queryKey, updater);
    
    try {
      // Perform the mutation
      const result = await mutationFn();
      return result;
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(queryKey, previousData);
      throw error;
    }
  },
};

/**
 * Performance monitoring
 */
if (import.meta.env.DEVELLOPMENT) {
  // Log cache statistics in development
  const logCacheStats = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    console.group('🔍 React Query Cache Stats');
    console.log('Total Queries:', queries.length);
    console.log('Active Queries:', queries.filter(q => q.observers.length > 0).length);
    console.log('Stale Queries:', queries.filter(q => q.isStale()).length);
    console.log('Fetching Queries:', queries.filter(q => q.state.fetchStatus === 'fetching').length);
    console.groupEnd();
  };
  
  // Log stats every 30 seconds in development
  setInterval(logCacheStats, 30000);
}

export default queryClient;