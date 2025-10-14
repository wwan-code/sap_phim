import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import notificationService from '@/services/notificationService';
import { useNotificationStore } from '@/stores/notificationStore';

const NOTIFICATION_QUERY_KEYS = {
  all: ['notifications'],
  lists: () => [...NOTIFICATION_QUERY_KEYS.all, 'list'],
  list: (filters) => [...NOTIFICATION_QUERY_KEYS.lists(), filters],
  unreadCount: () => [...NOTIFICATION_QUERY_KEYS.all, 'unread-count'],
};

/**
 * Hook chính để quản lý dữ liệu thông báo với React Query.
 */
export const useNotificationQueries = () => {
  const queryClient = useQueryClient();
  const { activeTab } = useNotificationStore();
  const { accessToken } = useSelector((state) => state.auth);

  // 1. Query để lấy danh sách thông báo (infinite scroll)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.list({ tab: activeTab }),
    queryFn: ({ pageParam = 1 }) =>
      notificationService.fetchNotifications({ tab: activeTab, page: pageParam, limit: 15 }),
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta?.hasMore) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 2, // 2 phút
    enabled: !!accessToken, // Chỉ fetch khi đã đăng nhập
  });

  // 2. Query để lấy số lượng thông báo chưa đọc
  const { data: unreadCountData } = useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.unreadCount(),
    queryFn: notificationService.fetchUnreadCount,
    staleTime: 1000 * 60, // 1 phút
    refetchOnWindowFocus: true,
    enabled: !!accessToken, // Chỉ fetch khi đã đăng nhập
  });

  // Helper function để xử lý optimistic update và invalidate cache
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.lists() });
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.unreadCount() });
  };

  // 3. Mutation để đánh dấu một thông báo đã đọc
  const { mutate: markAsRead } = useMutation({
    mutationFn: notificationService.markNotificationAsRead,
    onSuccess: invalidateQueries,
    // TODO: Thêm optimistic update nếu cần
  });

  // 4. Mutation để đánh dấu nhiều thông báo đã đọc
  const { mutate: markBulkAsRead } = useMutation({
    mutationFn: notificationService.markBulkAsRead,
    onSuccess: invalidateQueries,
  });

  // 5. Mutation để đánh dấu tất cả đã đọc
  const { mutate: markAllAsRead } = useMutation({
    mutationFn: notificationService.markAllNotificationsAsRead,
    onSuccess: invalidateQueries,
  });

  // 6. Mutation để xóa một thông báo (với optimistic update)
  const { mutate: deleteNotification } = useMutation({
    mutationFn: notificationService.deleteNotification,
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_QUERY_KEYS.lists() });
      const previousData = queryClient.getQueryData(NOTIFICATION_QUERY_KEYS.list({ tab: activeTab }));

      queryClient.setQueryData(NOTIFICATION_QUERY_KEYS.list({ tab: activeTab }), (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            data: page.data.filter(n => n.id !== deletedId),
          })),
        };
      });

      // Giảm số lượng chưa đọc nếu thông báo bị xóa là chưa đọc
      const notificationToDelete = previousData?.pages
        .flatMap(p => p.data)
        .find(n => n.id === deletedId);
      if (notificationToDelete && !notificationToDelete.isRead) {
        queryClient.setQueryData(NOTIFICATION_QUERY_KEYS.unreadCount(), (old) => (old > 0 ? old - 1 : 0));
      }

      return { previousData };
    },
    onError: (err, deletedId, context) => {
      queryClient.setQueryData(NOTIFICATION_QUERY_KEYS.list({ tab: activeTab }), context.previousData);
      invalidateQueries(); // Sync lại với server
    },
    onSettled: () => {
      invalidateQueries();
    },
  });

  const notifications = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    notifications,
    unreadCount: unreadCountData ?? 0,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    markAsRead,
    markBulkAsRead,
    markAllAsRead,
    deleteNotification,
    invalidateQueries, // export để dùng trong socket manager
    clearNotificationCache: () => {
      queryClient.removeQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
    },
  };
};
