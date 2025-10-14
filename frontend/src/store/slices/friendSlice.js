import { createSlice } from '@reduxjs/toolkit';
import { queryClient } from '@/utils/queryClient';
import { friendQueryKeys } from '@/hooks/useFriendQueries';

const initialState = {
  // Trạng thái online của bạn bè sẽ được quản lý ở đây
  // Key là userId, value là { online: boolean, lastOnline: Date }
  friendStatuses: {},
};

const friendSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {
    /**
     * Cập nhật trạng thái online/offline của một người dùng (bạn bè).
     * Dữ liệu này được đẩy từ server qua socket.
     * React Query sẽ tự động cập nhật dữ liệu bạn bè, nhưng trạng thái online
     * có thể được cập nhật tức thì ở đây để UI phản ứng nhanh hơn.
     */
    onUserStatusUpdate: (state, action) => {
      const { userId, online, lastOnline } = action.payload;
      state.friendStatuses[userId] = { online, lastOnline };

      // Cập nhật dữ liệu trong cache của React Query một cách lạc quan (optimistic)
      // để các component sử dụng useGetFriends() và useSearchUsers() có thể re-render.

      // Cập nhật danh sách bạn bè (infinite query structure)
      queryClient.setQueryData(
        friendQueryKeys.lists(),
        (oldData) => {
          if (!oldData || !oldData.pages) return oldData;
          
          return {
            ...oldData,
            pages: oldData.pages.map(page => {
              if (!page || !page.data || !Array.isArray(page.data)) return page;
              
              return {
                ...page,
                data: page.data.map(item =>
                  item.id === userId ? { ...item, online, lastOnline } : item
                )
              };
            })
          };
        }
      );

      // Cập nhật kết quả tìm kiếm (invalidate để re-fetch nếu cần)
      // Hoặc có thể cập nhật optimistic nếu có cấu trúc dữ liệu cụ thể cho search
      // Hiện tại, invalidate là an toàn nhất vì search queries có thể rất đa dạng
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.search('') });
    },

    /**
     * Xóa toàn bộ trạng thái của slice này khi người dùng đăng xuất.
     */
    clearFriendState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  onUserStatusUpdate,
  clearFriendState
} = friendSlice.actions;

export default friendSlice.reducer;
