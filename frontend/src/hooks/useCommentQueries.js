import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import commentService from '@/services/commentService';
import { toast } from 'react-toastify';

/**
 * Key cho React Query cache
 */
const COMMENT_QUERY_KEYS = {
    comments: (contentType, contentId, sort) => ['comments', contentType, contentId, sort],
    movieCommentsWithEpisodes: (movieId, sort) => ['movieCommentsWithEpisodes', movieId, sort],
    replies: (parentId, sort) => ['replies', parentId, sort],
    reportedComments: (filters) => ['reportedComments', filters],
    commentStatsAdmin: (filters) => ['commentStatsAdmin', filters],
};

/**
 * Custom hook để lấy danh sách bình luận gốc hoặc bình luận của phim + tập.
 * Sử dụng `useInfiniteQuery` để hỗ trợ pagination (Load More).
 * @param {'movie' | 'episode'} contentType - Loại nội dung.
 * @param {number} contentId - ID của nội dung (movieId hoặc episodeId).
 * @param {string} sort - Kiểu sắp xếp ('latest' | 'oldest' | 'popular').
 * @param {boolean} isMovieWithEpisodes - Cờ để xác định có lấy comments của phim + tập không.
 * @returns {object} Kết quả từ useInfiniteQuery.
 */
export const useComments = (contentType, contentId, sort, isMovieWithEpisodes = false) => {
    const queryClient = useQueryClient();

    return useInfiniteQuery({
        queryKey: isMovieWithEpisodes
            ? COMMENT_QUERY_KEYS.movieCommentsWithEpisodes(contentId, sort)
            : COMMENT_QUERY_KEYS.comments(contentType, contentId, sort),
        queryFn: async ({ pageParam = 1 }) => {
            const params = { page: pageParam, limit: 10, sort };
            if (isMovieWithEpisodes) {
                const res = await commentService.getMovieCommentsWithEpisodes(contentId, params);
                return res.data;
            } else {
                const res = await commentService.getComments(contentType, contentId, params);
                return res.data;
            }
        },
        getNextPageParam: (lastPage, allPages) => {
            const { meta } = lastPage;
            return meta.page < meta.totalPages ? meta.page + 1 : undefined;
        },
        initialPageParam: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
};

/**
 * Custom hook để lấy danh sách replies của một bình luận cha.
 * Sử dụng `useInfiniteQuery` để hỗ trợ pagination (Load More).
 * @param {number} parentId - ID của bình luận cha.
 * @param {string} sort - Kiểu sắp xếp ('latest' | 'oldest' | 'popular').
 * @returns {object} Kết quả từ useInfiniteQuery.
 */
export const useReplies = (parentId, sort) => {
    return useInfiniteQuery({
        queryKey: COMMENT_QUERY_KEYS.replies(parentId, sort),
        queryFn: async ({ pageParam = 1 }) => {
            const res = await commentService.getReplies(parentId, { page: pageParam, limit: 5, sort });
            return res.data;
        },
        getNextPageParam: (lastPage, allPages) => {
            const { meta } = lastPage;
            return meta.page < meta.totalPages ? meta.page + 1 : undefined;
        },
        initialPageParam: 1,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        enabled: !!parentId, // Chỉ fetch khi có parentId
    });
};

/**
 * Custom hook để tạo bình luận mới.
 * Hỗ trợ optimistic update.
 * @param {object} queryKeyToInvalidate - Query key để invalidate sau khi mutation thành công.
 * @returns {object} Kết quả từ useMutation.
 */
export const useCreateComment = (queryKeyToInvalidate) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: commentService.createComment,
        onMutate: async (newCommentData) => {
            // Hủy các fetches đang chờ xử lý cho queryKeyToInvalidate
            await queryClient.cancelQueries({ queryKey: queryKeyToInvalidate });

            // Lấy snapshot của dữ liệu trước đó
            const previousComments = queryClient.getQueryData(queryKeyToInvalidate);

            // Optimistically update cache
            queryClient.setQueryData(queryKeyToInvalidate, (oldData) => {
                if (!oldData) return oldData;

                const newComment = {
                    ...newCommentData,
                    id: `temp-${Date.now()}`, // ID tạm thời
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    user: {
                        // Giả định user info có sẵn từ context hoặc props
                        id: newCommentData.userId,
                        username: 'Bạn', // Placeholder
                        avatarUrl: 'https://via.placeholder.com/40', // Placeholder
                        roles: [{ name: 'user' }]
                    },
                    likes: [],
                    isLiked: false,
                    isReported: false,
                    hasReplies: false,
                    repliesCount: 0,
                    replies: [],
                    isSpoiler: newCommentData.isSpoiler || false,
                    isEdited: false,
                    isApproved: true, // Giả định được duyệt ngay
                    isHidden: false,
                };

                // Nếu là reply, tìm và thêm vào replies của comment cha (hỗ trợ nested replies)
                if (newCommentData.parentId) {
                    const addReplyToComment = (comments, parentId, newReply) => {
                        return comments.map(comment => {
                            if (comment.id === parentId) {
                                return {
                                    ...comment,
                                    repliesCount: (comment.repliesCount || 0) + 1,
                                    replies: [newReply, ...(comment.replies || [])],
                                };
                            }
                            // Tìm trong nested replies
                            if (comment.replies && comment.replies.length > 0) {
                                return {
                                    ...comment,
                                    replies: addReplyToComment(comment.replies, parentId, newReply)
                                };
                            }
                            return comment;
                        });
                    };

                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            data: addReplyToComment(page.data, newCommentData.parentId, newComment),
                        })),
                    };
                } else {
                    // Nếu là comment gốc, thêm vào đầu danh sách comments
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page, index) => {
                            if (index === 0) { // Chỉ thêm vào trang đầu tiên
                                return {
                                    ...page,
                                    data: [newComment, ...page.data],
                                };
                            }
                            return page;
                        }),
                    };
                }
            });

            return { previousComments };
        },
        onSuccess: (data, variables, context) => {
            toast.success(data.message || 'Bình luận đã được tạo thành công!');
            // Invalidate query để refetch dữ liệu mới nhất từ server
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
        },
        onError: (err, newCommentData, context) => {
            toast.error(err.response?.data?.message || 'Tạo bình luận thất bại.');
            // Rollback optimistic update nếu có lỗi
            if (context?.previousComments) {
                queryClient.setQueryData(queryKeyToInvalidate, context.previousComments);
            }
        },
    });
};

/**
 * Custom hook để cập nhật bình luận.
 * Hỗ trợ optimistic update.
 * @param {object} queryKeyToInvalidate - Query key để invalidate sau khi mutation thành công.
 * @returns {object} Kết quả từ useMutation.
 */
export const useUpdateComment = (queryKeyToInvalidate) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, commentData }) => commentService.updateComment(id, commentData),
        onMutate: async ({ id, commentData }) => {
            await queryClient.cancelQueries({ queryKey: queryKeyToInvalidate });
            const previousComments = queryClient.getQueryData(queryKeyToInvalidate);

            queryClient.setQueryData(queryKeyToInvalidate, (oldData) => {
                if (!oldData) return oldData;

                const updateCommentInTree = (comments, commentId, updateData) => {
                    return comments.map(comment => {
                        if (comment.id === commentId) {
                            return {
                                ...comment,
                                text: updateData.text !== undefined ? updateData.text : comment.text,
                                isSpoiler: updateData.isSpoiler !== undefined ? updateData.isSpoiler : comment.isSpoiler,
                                isEdited: true,
                                updatedAt: new Date().toISOString(),
                            };
                        }
                        // Cập nhật trong nested replies
                        if (comment.replies && comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateCommentInTree(comment.replies, commentId, updateData)
                            };
                        }
                        return comment;
                    });
                };

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        data: updateCommentInTree(page.data, id, commentData),
                    })),
                };
            });

            return { previousComments };
        },
        onSuccess: (data, variables, context) => {
            toast.success(data.message || 'Bình luận đã được cập nhật thành công!');
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Cập nhật bình luận thất bại.');
            if (context?.previousComments) {
                queryClient.setQueryData(queryKeyToInvalidate, context.previousComments);
            }
        },
    });
};

/**
 * Custom hook để xóa bình luận.
 * Hỗ trợ optimistic update.
 * @param {object} queryKeyToInvalidate - Query key để invalidate sau khi mutation thành công.
 * @returns {object} Kết quả từ useMutation.
 */
export const useDeleteComment = (queryKeyToInvalidate) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: commentService.deleteComment,
        onMutate: async (commentId) => {
            await queryClient.cancelQueries({ queryKey: queryKeyToInvalidate });
            const previousComments = queryClient.getQueryData(queryKeyToInvalidate);

            queryClient.setQueryData(queryKeyToInvalidate, (oldData) => {
                if (!oldData) return oldData;

                const deleteCommentFromTree = (comments, commentIdToDelete) => {
                    return comments
                        .filter(comment => comment.id !== commentIdToDelete)
                        .map(comment => {
                            // Nếu comment có replies, xóa comment trong replies và cập nhật repliesCount
                            if (comment.replies && comment.replies.length > 0) {
                                const filteredReplies = deleteCommentFromTree(comment.replies, commentIdToDelete);
                                return {
                                    ...comment,
                                    replies: filteredReplies,
                                    repliesCount: filteredReplies.length
                                };
                            }
                            return comment;
                        });
                };

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        data: deleteCommentFromTree(page.data, commentId),
                    })),
                };
            });

            return { previousComments };
        },
        onSuccess: (data, variables, context) => {
            toast.success(data.message || 'Bình luận đã được xóa thành công!');
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Xóa bình luận thất bại.');
            if (context?.previousComments) {
                queryClient.setQueryData(queryKeyToInvalidate, context.previousComments);
            }
        },
    });
};

/**
 * Custom hook để like/unlike bình luận.
 * Hỗ trợ optimistic update cho cả comment gốc và replies.
 * @param {object} queryKeyToInvalidate - Query key để invalidate sau khi mutation thành công.
 * @returns {object} Kết quả từ useMutation.
 */
export const useToggleLike = (queryKeyToInvalidate, currentUserId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: commentService.toggleLike,
        onMutate: async (commentId) => {
            // Cancel tất cả queries liên quan đến comments và replies
            await queryClient.cancelQueries({ queryKey: ['comments'] });
            await queryClient.cancelQueries({ queryKey: ['replies'] });
            
            const previousComments = queryClient.getQueryData(queryKeyToInvalidate);

            // Cập nhật optimistic cho tất cả queries có thể chứa comment này
            const updateLikeStatus = (comments) =>
                comments.map(comment => {
                    if (comment.id === commentId) {
                        const isLiked = !comment.isLiked;
                            const newLikesCount = isLiked
                                ? (comment.likesCount || 0) + 1
                                : (comment.likesCount || 0) - 1;
                            return {
                                ...comment,
                                isLiked,
                                likesCount: newLikesCount < 0 ? 0 : newLikesCount, // Ensure likes don't go below 0
                            };
                    }
                    // Cập nhật trong nested replies
                    if (comment.replies && comment.replies.length > 0) {
                        return {
                            ...comment,
                            replies: updateLikeStatus(comment.replies)
                        };
                    }
                    return comment;
                });

            // Cập nhật cho query hiện tại
            queryClient.setQueryData(queryKeyToInvalidate, (oldData) => {
                if (!oldData) return oldData;
                console.log("oldData", oldData)

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        data: updateLikeStatus(page.data),
                    })),
                };
            });

            // Cập nhật cho tất cả replies queries có thể chứa comment này
            queryClient.setQueriesData(
                { queryKey: ['replies'] },
                (oldData) => {
                    if (!oldData) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            data: updateLikeStatus(page.data),
                        })),
                    };
                }
            );

            return { previousComments };
        },
        onSuccess: (data, variables, context) => {
            toast.success(data.message || 'Thao tác like/unlike thành công.');
            // Invalidate tất cả comment và reply queries
            queryClient.invalidateQueries({ queryKey: ['comments'] });
            queryClient.invalidateQueries({ queryKey: ['replies'] });
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Thao tác like/unlike thất bại.');
            if (context?.previousComments) {
                queryClient.setQueryData(queryKeyToInvalidate, context.previousComments);
            }
        },
    });
};

/**
 * Custom hook để report bình luận.
 * Hỗ trợ optimistic update.
 * @param {object} queryKeyToInvalidate - Query key để invalidate sau khi mutation thành công.
 * @returns {object} Kết quả từ useMutation.
 */
export const useReportComment = (queryKeyToInvalidate, currentUserId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: commentService.reportComment,
        onMutate: async (commentId) => {
            await queryClient.cancelQueries({ queryKey: queryKeyToInvalidate });
            const previousComments = queryClient.getQueryData(queryKeyToInvalidate);

            queryClient.setQueryData(queryKeyToInvalidate, (oldData) => {
                if (!oldData) return oldData;

                const updateReportStatus = (comments) =>
                    comments.map(comment => {
                        if (comment.id === commentId) {
                            const isReported = !comment.isReported;
                            const reports = isReported
                                ? [...(comment.reports || []), currentUserId]
                                : (comment.reports || []).filter(id => id !== currentUserId);
                            return {
                                ...comment,
                                isReported,
                                reports,
                            };
                        }
                        // Cập nhật trong nested replies
                        if (comment.replies && comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateReportStatus(comment.replies)
                            };
                        }
                        return comment;
                    });

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        data: updateReportStatus(page.data),
                    })),
                };
            });

            return { previousComments };
        },
        onSuccess: (data, variables, context) => {
            toast.success(data.message || 'Báo cáo bình luận thành công.');
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
            // Invalidate reported comments list as well
            queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.reportedComments({}) });
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Báo cáo bình luận thất bại.');
            if (context?.previousComments) {
                queryClient.setQueryData(queryKeyToInvalidate, context.previousComments);
            }
        },
    });
};

// Admin Hooks

/**
 * Custom hook để lấy danh sách bình luận bị báo cáo (Admin).
 * @param {object} filters - Các bộ lọc (minReports, userId, contentId, contentType, startDate, endDate, page, limit, sort).
 * @returns {object} Kết quả từ useQuery.
 */
export const useReportedComments = (filters) => {
    return useQuery({
        queryKey: COMMENT_QUERY_KEYS.reportedComments(filters),
        queryFn: async () => {
            const res = await commentService.getReportedComments(filters);
            return res.data;
        },
        staleTime: 1 * 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
};

/**
 * Custom hook để lấy thống kê bình luận cho Admin.
 * @param {object} filters - Các bộ lọc (startDate, endDate, contentType, contentId, userId).
 * @returns {object} Kết quả từ useQuery.
 */
export const useCommentStatsAdmin = (filters) => {
    return useQuery({
        queryKey: COMMENT_QUERY_KEYS.commentStatsAdmin(filters),
        queryFn: async () => {
            const res = await commentService.getCommentStatsAdmin(filters);
            return res.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
};

/**
 * Custom hook để duyệt/bỏ duyệt bình luận (Admin).
 * @param {object} queryKeyToInvalidate - Query key để invalidate sau khi mutation thành công.
 * @returns {object} Kết quả từ useMutation.
 */
export const useApproveComment = (queryKeyToInvalidate) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, isApproved }) => commentService.approveComment(id, isApproved),
        onMutate: async ({ id, isApproved }) => {
            await queryClient.cancelQueries({ queryKey: queryKeyToInvalidate });
            const previousComments = queryClient.getQueryData(queryKeyToInvalidate);

            queryClient.setQueryData(queryKeyToInvalidate, (oldData) => {
                if (!oldData) return oldData;
                const updateApprovalStatus = (comments) =>
                    comments.map(comment => {
                        if (comment.id === id) {
                            return { ...comment, isApproved };
                        }
                        if (comment.replies) {
                            return { ...comment, replies: updateApprovalStatus(comment.replies) };
                        }
                        return comment;
                    });

                if (oldData.pages) {
                    // Handle infinite query data
                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({ ...page, data: updateApprovalStatus(page.data) }))
                    };
                } else {
                    // Handle standard query data (like from useReportedComments)
                    return {
                        ...oldData,
                        data: updateApprovalStatus(oldData.data || [])
                    };
                }
            });
            return { previousComments };
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Cập nhật trạng thái duyệt thành công.');
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
            queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.reportedComments({}) }); // Invalidate reported comments
            queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.commentStatsAdmin({}) }); // Invalidate admin stats
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Cập nhật trạng thái duyệt thất bại.');
            if (context?.previousComments) {
                queryClient.setQueryData(queryKeyToInvalidate, context.previousComments);
            }
        },
    });
};

/**
 * Custom hook để ghim/bỏ ghim bình luận (Admin).
 * @param {object} queryKeyToInvalidate - Query key để invalidate sau khi mutation thành công.
 * @returns {object} Kết quả từ useMutation.
 */
export const usePinComment = (queryKeyToInvalidate) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, isPinned }) => commentService.pinComment(id, isPinned),
        onMutate: async ({ id, isPinned }) => {
            await queryClient.cancelQueries({ queryKey: queryKeyToInvalidate });
            const previousComments = queryClient.getQueryData(queryKeyToInvalidate);

            queryClient.setQueryData(queryKeyToInvalidate, (oldData) => {
                if (!oldData) return oldData;
                const updatePinStatus = (comments) =>
                    comments.map(comment => {
                        if (comment.id === id) {
                            return { ...comment, isPinned };
                        }
                        return comment;
                    });
                return { ...oldData, pages: oldData.pages.map(page => ({ ...page, data: updatePinStatus(page.data) })) };
            });
            return { previousComments };
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Cập nhật trạng thái ghim thành công.');
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
            queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.reportedComments({}) }); // Invalidate reported comments
            queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.commentStatsAdmin({}) }); // Invalidate admin stats
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Cập nhật trạng thái ghim thất bại.');
            if (context?.previousComments) {
                queryClient.setQueryData(queryKeyToInvalidate, context.previousComments);
            }
        },
    });
};

/**
 * Custom hook để ẩn/hiện bình luận (Admin).
 * @param {object} queryKeyToInvalidate - Query key để invalidate sau khi mutation thành công.
 * @returns {object} Kết quả từ useMutation.
 */
export const useHideComment = (queryKeyToInvalidate) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, isHidden }) => commentService.hideComment(id, isHidden),
        onMutate: async ({ id, isHidden }) => {
            await queryClient.cancelQueries({ queryKey: queryKeyToInvalidate });
            const previousComments = queryClient.getQueryData(queryKeyToInvalidate);

            queryClient.setQueryData(queryKeyToInvalidate, (oldData) => {
                if (!oldData) return oldData;
                const updateHiddenStatus = (comments) =>
                    comments.map(comment => {
                        if (comment.id === id) {
                            return { ...comment, isHidden };
                        }
                        if (comment.replies) {
                            return { ...comment, replies: updateHiddenStatus(comment.replies) };
                        }
                        return comment;
                    });
                
                if (oldData.pages) {
                    // Handle infinite query data
                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({ ...page, data: updateHiddenStatus(page.data) }))
                    };
                } else {
                    // Handle standard query data
                    return {
                        ...oldData,
                        data: updateHiddenStatus(oldData.data || [])
                    };
                }
            });
            return { previousComments };
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Cập nhật trạng thái ẩn thành công.');
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
            queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.reportedComments({}) }); // Invalidate reported comments
            queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.commentStatsAdmin({}) }); // Invalidate admin stats
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Cập nhật trạng thái ẩn thất bại.');
            if (context?.previousComments) {
                queryClient.setQueryData(queryKeyToInvalidate, context.previousComments);
            }
        },
    });
};

/**
 * Custom hook để lấy comment với parent chain (for navigation)
 * @param {number} commentId - ID của comment
 * @returns {object} Kết quả từ useQuery
 */
export const useCommentWithParents = (commentId) => {
    return useQuery({
        queryKey: ['comment-with-parents', commentId],
        queryFn: async () => {
            const res = await commentService.getCommentWithParents(commentId);
            return res.data;
        },
        enabled: !!commentId,
        staleTime: 10 * 60 * 1000, // Cache 10 phút
        gcTime: 30 * 60 * 1000, // Keep in cache 30 phút
    });
};

/**
 * Custom hook để xóa bình luận bởi admin.
 * @param {object} queryKeyToInvalidate - Query key để invalidate sau khi mutation thành công.
 * @returns {object} Kết quả từ useMutation.
 */
export const useAdminDeleteComment = (queryKeyToInvalidate) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: commentService.deleteCommentByAdmin,
        onMutate: async (commentId) => {
            await queryClient.cancelQueries({ queryKey: queryKeyToInvalidate });
            const previousComments = queryClient.getQueryData(queryKeyToInvalidate);

            queryClient.setQueryData(queryKeyToInvalidate, (oldData) => {
                if (!oldData) return oldData;

                const filterComments = (comments) =>
                    comments.filter(comment => comment.id !== commentId)
                        .map(comment => ({
                            ...comment,
                            replies: comment.replies ? filterComments(comment.replies) : []
                        }));

                if (oldData.pages) {
                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            data: filterComments(page.data),
                        })),
                    };
                } else {
                    return {
                        ...oldData,
                        data: filterComments(oldData.data || [])
                    };
                }
            });
            return { previousComments };
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Bình luận đã được xóa bởi admin thành công.');
            queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
            queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.reportedComments({}) }); // Invalidate reported comments
            queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.commentStatsAdmin({}) }); // Invalidate admin stats
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Xóa bình luận bởi admin thất bại.');
            if (context?.previousComments) {
                queryClient.setQueryData(queryKeyToInvalidate, context.previousComments);
            }
        },
    });
};
