import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import * as reelService from '@/services/reelService';
import { toast } from 'react-toastify';
import { emitSocketEvent } from '@/socket/socketManager';

// ==================== QUERY KEYS ====================
export const reelQueryKeys = {
  all: ['reels'],
  feed: (page, limit) => [...reelQueryKeys.all, 'feed', page, limit],
  feedInfinite: () => [...reelQueryKeys.all, 'feed-infinite'],
  detail: (id) => [...reelQueryKeys.all, 'detail', id],
  trending: (limit) => [...reelQueryKeys.all, 'trending', limit],
  comments: (reelId, page, limit) => [...reelQueryKeys.all, 'comments', reelId, page, limit],
  userReels: (userId, page, limit) => [...reelQueryKeys.all, 'user', userId, page, limit],
  admin: (filters) => [...reelQueryKeys.all, 'admin', filters],
};

// ==================== QUERIES ====================

/**
 * Hook lấy Reel Feed với Infinite Scroll
 * Dùng useInfiniteQuery cho trải nghiệm scroll mượt
 */
export const useReelFeedInfinite = (limit = 10) => {
  return useInfiniteQuery({
    queryKey: reelQueryKeys.feedInfinite(),
    queryFn: ({ pageParam = 1 }) => reelService.getReelFeed(pageParam, limit),
    getNextPageParam: (lastPage, pages) => {
      // Kiểm tra xem còn data không
      if (!lastPage?.data?.reels || lastPage.data.reels.length === 0) {
        return undefined; // Không còn trang nữa
      }
      
      // Nếu số reels < limit → đã hết data
      if (lastPage.data.reels.length < limit) {
        return undefined;
      }
      
      return pages.length + 1; // Trang tiếp theo
    },
    staleTime: 30 * 1000, // 30s - Feed cần fresh
    gcTime: 5 * 60 * 1000, // 5 phút
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook lấy Reel Feed thông thường (pagination)
 */
export const useReelFeed = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: reelQueryKeys.feed(page, limit),
    queryFn: () => reelService.getReelFeed(page, limit),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook lấy chi tiết một Reel
 */
export const useReelDetail = (reelId, options = {}) => {
  return useQuery({
    queryKey: reelQueryKeys.detail(reelId),
    queryFn: () => reelService.getReelById(reelId),
    enabled: !!reelId, // Chỉ fetch khi có reelId
    staleTime: 2 * 60 * 1000, // 2 phút
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook lấy Trending Reels
 */
export const useTrendingReels = (limit = 10) => {
  return useQuery({
    queryKey: reelQueryKeys.trending(limit),
    queryFn: () => reelService.getTrendingReels(limit),
    staleTime: 3 * 60 * 1000, // 3 phút - trending ít thay đổi
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook lấy Comments của Reel
 */
export const useReelComments = (reelId, page = 1, limit = 10) => {
  return useQuery({
    queryKey: reelQueryKeys.comments(reelId, page, limit),
    queryFn: () => reelService.getReelComments(reelId, page, limit),
    enabled: !!reelId,
    staleTime: 1 * 60 * 1000, // 1 phút
  });
};

/**
 * Hook lấy Reels của một User
 */
export const useUserReels = (userId, page = 1, limit = 10) => {
  return useQuery({
    queryKey: reelQueryKeys.userReels(userId, page, limit),
    queryFn: () => reelService.getUserReels(userId, page, limit),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

// ==================== MUTATIONS ====================

/**
 * Hook tạo Reel mới
 */
export const useCreateReel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData) => reelService.createReel(formData),
    onSuccess: (data) => {
      toast.success('Video đang được xử lý! Bạn sẽ nhận thông báo khi hoàn tất.');
      
      // Invalidate feed để refresh
      queryClient.invalidateQueries({ queryKey: reelQueryKeys.feedInfinite() });
      queryClient.invalidateQueries({ queryKey: reelQueryKeys.all });
    },
    onError: (error) => {
      const message = error?.response?.data?.message || 'Không thể upload video';
      toast.error(message);
    },
  });
};

/**
 * Hook cập nhật Reel
 */
export const useUpdateReel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reelId, data }) => reelService.updateReel(reelId, data),
    onSuccess: (data, { reelId }) => {
      toast.success('Đã cập nhật Reel thành công!');
      // Invalidate detail and feed queries
      queryClient.invalidateQueries({ queryKey: reelQueryKeys.detail(reelId) });
      queryClient.invalidateQueries({ queryKey: reelQueryKeys.feedInfinite() });
    },
    onError: (error) => {
      const message = error?.response?.data?.message || 'Không thể cập nhật Reel';
      toast.error(message);
    },
  });
};

/**
 * Hook xóa Reel
 */
export const useDeleteReel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reelId) => reelService.deleteReel(reelId),
    onSuccess: () => {
      toast.success('Đã xóa Reel thành công!');
      // Invalidate all reel queries to ensure UI consistency
      queryClient.invalidateQueries({ queryKey: reelQueryKeys.all });
    },
    onError: (error) => {
      const message = error?.response?.data?.message || 'Không thể xóa Reel';
      toast.error(message);
    },
  });
};

/**
 * Hook toggle like Reel
 * Có optimistic update để UX mượt
 */
export const useToggleLikeReel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (reelId) => reelService.toggleLikeReel(reelId),
    
    // Optimistic update
    onMutate: async (reelId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: reelQueryKeys.detail(reelId) });
      
      // Snapshot previous value
      const previousReel = queryClient.getQueryData(reelQueryKeys.detail(reelId));
      
      // Optimistically update
      if (previousReel) {
        queryClient.setQueryData(reelQueryKeys.detail(reelId), (old) => ({
          ...old,
          data: {
            ...old.data,
            reel: {
              ...old.data.reel,
              isLiked: !old.data.reel.isLiked,
              likesCount: old.data.reel.isLiked 
                ? old.data.reel.likesCount - 1 
                : old.data.reel.likesCount + 1,
            },
          },
        }));
      }
      
      // Also update trong feed nếu có
      queryClient.setQueriesData(
        { queryKey: reelQueryKeys.feedInfinite() },
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: {
                ...page.data,
                reels: page.data.reels.map((reel) =>
                  reel.id === reelId
                    ? {
                        ...reel,
                        isLiked: !reel.isLiked,
                        likesCount: reel.isLiked ? reel.likesCount - 1 : reel.likesCount + 1,
                      }
                    : reel
                ),
              },
            })),
          };
        }
      );
      
      return { previousReel };
    },
    
    onError: (err, reelId, context) => {
      // Rollback on error
      if (context?.previousReel) {
        queryClient.setQueryData(reelQueryKeys.detail(reelId), context.previousReel);
      }
      toast.error('Không thể thực hiện thao tác');
    },
    
    onSettled: (data, error, reelId) => {
      // Refetch để sync với server
      queryClient.invalidateQueries({ queryKey: reelQueryKeys.detail(reelId) });
    },
  });
};

/**
 * Hook thêm comment vào Reel
 */
export const useAddReelComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ reelId, content, parentId }) =>
      reelService.addReelComment(reelId, content, parentId),
    
    onSuccess: (data, variables) => {
      const { reelId } = variables;
      
      // Invalidate comments
      queryClient.invalidateQueries({ 
        queryKey: reelQueryKeys.comments(reelId) 
      });
      
      // Update comments count trong reel detail
      queryClient.setQueryData(reelQueryKeys.detail(reelId), (old) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            reel: {
              ...old.data.reel,
              commentsCount: old.data.reel.commentsCount + 1,
            },
          },
        };
      });
      
      toast.success('Đã thêm bình luận');
    },
    
    onError: (error) => {
      const message = error?.response?.data?.message || 'Không thể thêm bình luận';
      toast.error(message);
    },
  });
};

/**
 * Hook AI suggest caption & hashtags
 */
export const useAISuggestCaption = () => {
  return useMutation({
    mutationFn: (videoDescription) =>
      reelService.suggestAICaptionAndHashtags(videoDescription),
    
    onError: (error) => {
      const message = error?.response?.data?.message || 'Không thể tạo gợi ý AI';
      toast.error(message);
    },
  });
};

/**
 * Hook AI analyze content
 */
export const useAnalyzeReelContent = () => {
  return useMutation({
    mutationFn: (videoUrl) => reelService.analyzeReelContent(videoUrl),
    onError: (error) => {
      const message = error?.response?.data?.message || 'Không thể phân tích nội dung video';
      toast.error(message);
    },
  });
};

// ==================== ADMIN QUERIES ====================

/**
 * Hook lấy tất cả Reels cho Admin
 */
export const useAdminReels = (page = 1, limit = 10, filters = {}) => {
  return useQuery({
    queryKey: reelQueryKeys.admin({ page, limit, ...filters }),
    queryFn: () => reelService.getAdminReels(page, limit, filters),
    staleTime: 30 * 1000,
  });
};

/**
 * Hook cập nhật status Reel (Admin)
 */
export const useUpdateReelStatusAdmin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ reelId, status }) =>
      reelService.updateReelStatusAdmin(reelId, status),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reelQueryKeys.admin({}) });
      toast.success('Đã cập nhật trạng thái Reel');
    },
    
    onError: (error) => {
      const message = error?.response?.data?.message || 'Không thể cập nhật';
      toast.error(message);
    },
  });
};

/**
 * Hook xóa Reel (Admin)
 */
export const useDeleteReelAdmin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (reelId) => reelService.deleteReelAdmin(reelId),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reelQueryKeys.admin({}) });
      toast.success('Đã xóa Reel');
    },
    
    onError: (error) => {
      const message = error?.response?.data?.message || 'Không thể xóa';
      toast.error(message);
    },
  });
};

// ==================== PREFETCH HELPERS ====================

/**
 * Prefetch reel tiếp theo để load nhanh
 */
export const usePrefetchNextReel = () => {
  const queryClient = useQueryClient();
  
  return (reelId) => {
    queryClient.prefetchQuery({
      queryKey: reelQueryKeys.detail(reelId),
      queryFn: () => reelService.getReelById(reelId),
      staleTime: 5 * 60 * 1000, // 5 phút
    });
  };
};

export default {
  useReelFeedInfinite,
  useReelFeed,
  useReelDetail,
  useTrendingReels,
  useReelComments,
  useUserReels,
  useCreateReel,
  useUpdateReel,
  useDeleteReel,
  useToggleLikeReel,
  useAddReelComment,
  useAISuggestCaption,
  useAnalyzeReelContent,
  useAdminReels,
  useUpdateReelStatusAdmin,
  useDeleteReelAdmin,
  usePrefetchNextReel,
};
