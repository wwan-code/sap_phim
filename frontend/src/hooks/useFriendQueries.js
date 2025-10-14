import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import friendService from '@/services/friendService';
import { useSelector } from 'react-redux';
// Khai báo key cho các query để quản lý tập trung và tránh lỗi chính tả
export const friendQueryKeys = {
  all: ['friends'],
  lists: () => [...friendQueryKeys.all, 'list'],
  pending: () => [...friendQueryKeys.all, 'pending'],
  sent: () => [...friendQueryKeys.all, 'sent'],
  search: (query) => [...friendQueryKeys.all, 'search', query],
};

/**
 * Hook để lấy danh sách bạn bè với infinite scroll
 * @returns {object} Trạng thái của infinite query từ React Query
 */
export const useGetFriends = () => {
  const { accessToken } = useSelector((state) => state.auth);
  return useInfiniteQuery({
    queryKey: friendQueryKeys.lists(),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await friendService.getFriends({ page: pageParam, limit: 10 });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.meta?.hasMore ? lastPage.meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    enabled: !!accessToken,
  });
};

/**
 * Hook để lấy danh sách lời mời kết bạn đang chờ với infinite scroll
 * @returns {object} Trạng thái của infinite query
 */
export const useGetPendingRequests = () => {
  return useInfiniteQuery({
    queryKey: friendQueryKeys.pending(),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await friendService.getPendingRequests({ page: pageParam, limit: 10 });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.meta?.hasMore ? lastPage.meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook để lấy danh sách lời mời kết bạn đã gửi với infinite scroll
 * @returns {object} Trạng thái của infinite query
 */
export const useGetSentRequests = () => {
  return useInfiniteQuery({
    queryKey: friendQueryKeys.sent(),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await friendService.getSentRequests({ page: pageParam, limit: 10 });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.meta?.hasMore ? lastPage.meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook để tìm kiếm người dùng.
 * @param {string} query - Chuỗi tìm kiếm.
 * @param {object} options - Tùy chọn cho query (ví dụ: enabled).
 * @returns {object} Trạng thái của query.
 */
export const useSearchUsers = (query, options = {}) => {
  return useQuery({
    queryKey: friendQueryKeys.search(query),
    queryFn: async () => {
      const response = await friendService.searchUsers(query);
      return response.data.data;
    },
    enabled: !!query && query.trim().length > 0, // Chỉ chạy query khi có chuỗi tìm kiếm
    staleTime: 1 * 60 * 1000, // 1 phút
    ...options,
  });
};

/**
 * Hook (mutation) để gửi lời mời kết bạn.
 * @returns {object} Trạng thái của mutation.
 */
export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => friendService.sendRequest(userId),
    onSuccess: (data, userId) => {
      toast.success('Lời mời kết bạn đã được gửi!');
      // Vô hiệu hóa cache của danh sách đã gửi và kết quả tìm kiếm để fetch lại
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.sent() });
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.search('') }); // Invalidate all searches
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.pending() }); // Invalidate pending for receiver
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Gửi lời mời thất bại.';
      toast.error(message);
    },
  });
};

/**
 * Hook (mutation) để chấp nhận lời mời kết bạn.
 * @returns {object} Trạng thái của mutation.
 */
export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId) => friendService.acceptRequest(inviteId),
    onSuccess: () => {
      toast.success('Đã chấp nhận lời mời kết bạn!');
      // Vô hiệu hóa cache của danh sách bạn bè, danh sách đang chờ và danh sách đã gửi
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.pending() });
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.sent() }); // Invalidate sent requests for sender
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.search('') }); // Invalidate all searches
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Chấp nhận lời mời thất bại.';
      toast.error(message);
    },
  });
};

/**
 * Hook (mutation) để từ chối lời mời kết bạn.
 * @returns {object} Trạng thái của mutation.
 */
export const useRejectFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId) => friendService.rejectRequest(inviteId),
    onSuccess: () => {
      toast.info('Đã từ chối lời mời kết bạn.');
      // Vô hiệu hóa cache của danh sách đang chờ và danh sách đã gửi
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.pending() });
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.sent() }); // Invalidate sent requests for sender
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.search('') }); // Invalidate all searches
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Từ chối lời mời thất bại.';
      toast.error(message);
    },
  });
};

/**
 * Hook (mutation) để hủy kết bạn.
 * @returns {object} Trạng thái của mutation.
 */
export const useRemoveFriend = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendId) => friendService.removeFriend(friendId),
    onSuccess: () => {
      toast.info('Đã hủy kết bạn.');
      // Vô hiệu hóa cache của danh sách bạn bè và kết quả tìm kiếm
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.search('') }); // Invalidate all searches
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Hủy kết bạn thất bại.';
      toast.error(message);
    },
  });
};
