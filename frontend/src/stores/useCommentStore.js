import { create } from 'zustand';

/**
 * Zustand store để quản lý các trạng thái UI cục bộ của Comment UI.
 * Bao gồm:
 * - activeSort: Kiểu sắp xếp bình luận hiện tại ('latest' | 'oldest' | 'popular')
 * - composingForId: ID của comment đang được trả lời (null nếu là bình luận gốc)
 * - editingId: ID của comment đang được chỉnh sửa
 * - expandedReplies: Set các ID của comment có replies đang được mở rộng
 * - loadingStates: Trạng thái loading cục bộ cho các hành động UI cụ thể
 * - error: Lỗi UI cục bộ
 */
const useCommentStore = create((set) => ({
    activeSort: 'latest', // 'latest' | 'oldest' | 'popular'
    composingForId: null, // ID của comment đang được trả lời
    editingId: null, // ID của comment đang được chỉnh sửa
    expandedReplies: new Set(), // Set các ID của comment có replies đang được mở rộng
    loadingStates: {}, // { [id]: boolean }
    error: null, // string | null

    /**
     * Cập nhật kiểu sắp xếp bình luận.
     * @param {'latest' | 'oldest' | 'popular'} sortType - Kiểu sắp xếp mới.
     */
    setActiveSort: (sortType) => set({ activeSort: sortType }),

    /**
     * Đặt ID của comment đang được trả lời.
     * @param {string | null} id - ID của comment cha, hoặc null để hủy.
     */
    setComposingForId: (id) => set({ composingForId: id }),

    /**
     * Đặt ID của comment đang được chỉnh sửa.
     * @param {string | null} id - ID của comment đang chỉnh sửa, hoặc null để hủy.
     */
    setEditingId: (id) => set({ editingId: id }),

    /**
     * Toggle trạng thái mở rộng/thu gọn replies cho một comment.
     * @param {string} commentId - ID của comment.
     */
    toggleExpandedReplies: (commentId) =>
        set((state) => {
            const newExpandedReplies = new Set(state.expandedReplies);
            if (newExpandedReplies.has(commentId)) {
                newExpandedReplies.delete(commentId);
            } else {
                newExpandedReplies.add(commentId);
            }
            return { expandedReplies: newExpandedReplies };
        }),

    /**
     * Đặt trạng thái loading cho một hành động cụ thể.
     * @param {string} key - Key định danh hành động (ví dụ: 'like-123', 'submit-form').
     * @param {boolean} isLoading - Trạng thái loading.
     */
    setLoadingState: (key, isLoading) =>
        set((state) => ({
            loadingStates: {
                ...state.loadingStates,
                [key]: isLoading,
            },
        })),

    /**
     * Đặt lỗi UI cục bộ.
     * @param {string | null} errorMessage - Thông báo lỗi, hoặc null để xóa lỗi.
     */
    setError: (errorMessage) => set({ error: errorMessage }),

    /**
     * Reset tất cả trạng thái UI về mặc định.
     */
    resetCommentUIState: () =>
        set({
            activeSort: 'latest',
            composingForId: null,
            editingId: null,
            expandedReplies: new Set(),
            loadingStates: {},
            error: null,
        }),
}));

export default useCommentStore;
