import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import friendService from '@/services/friendService';

const initialState = {
  friends: [],
  pendingRequests: [],
  sentRequests: [],
  searchResults: [],
  loading: false,
  error: null,
  lastFetchedFriends: null, // Thời điểm cuối cùng fetch danh sách bạn bè
  lastFetchedPendingRequests: null, // Thời điểm cuối cùng fetch lời mời đang chờ
  lastFetchedSentRequests: null, // Thời điểm cuối cùng fetch lời mời đã gửi
};

// Async Thunks cho các thao tác bạn bè
export const fetchFriends = createAsyncThunk(
  'friends/fetchFriends',
  async (_, { rejectWithValue }) => {
    try {
      const response = await friendService.getFriends();
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Lấy danh sách bạn bè thất bại.';
      return rejectWithValue(message);
    }
  }
);

export const fetchPendingRequests = createAsyncThunk(
  'friends/fetchPendingRequests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await friendService.getPendingRequests();
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Lấy lời mời đang chờ thất bại.';
      return rejectWithValue(message);
    }
  }
);

export const fetchSentRequests = createAsyncThunk(
  'friends/fetchSentRequests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await friendService.getSentRequests();
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Lấy lời mời đã gửi thất bại.';
      return rejectWithValue(message);
    }
  }
);

export const sendFriendRequest = createAsyncThunk(
  'friends/sendFriendRequest',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await friendService.sendRequest(userId);
      toast.success('Lời mời kết bạn đã được gửi!');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Gửi lời mời kết bạn thất bại.';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const acceptFriendRequest = createAsyncThunk(
  'friends/acceptFriendRequest',
  async (inviteId, { rejectWithValue }) => {
    try {
      const response = await friendService.acceptRequest(inviteId);
      toast.success('Lời mời kết bạn đã được chấp nhận!');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Chấp nhận lời mời thất bại.';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const rejectFriendRequest = createAsyncThunk(
  'friends/rejectFriendRequest',
  async (inviteId, { rejectWithValue }) => {
    try {
      const response = await friendService.rejectRequest(inviteId);
      toast.info('Lời mời kết bạn đã bị từ chối.');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Từ chối lời mời thất bại.';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const removeFriend = createAsyncThunk(
  'friends/removeFriend',
  async (friendId, { rejectWithValue }) => {
    try {
      await friendService.removeFriend(friendId);
      toast.info('Đã hủy kết bạn.');
      return friendId;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Hủy kết bạn thất bại.';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const searchUsers = createAsyncThunk(
  'friends/searchUsers',
  async (query, { rejectWithValue }) => {
    try {
      const response = await friendService.searchUsers(query);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Tìm kiếm người dùng thất bại.';
      return rejectWithValue(message);
    }
  }
);

const friendSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {
    // Xử lý sự kiện socket khi có lời mời kết bạn mới
    onFriendRequestReceived: (state, action) => {
      const newRequest = action.payload;
      // Kiểm tra trùng lặp trước khi thêm
      if (!state.pendingRequests.some(req => req.id === newRequest.id)) {
        state.pendingRequests.unshift(newRequest);
        toast.info(`Bạn có lời mời kết bạn mới từ ${newRequest.sender.username}`);
      }
    },
    // Xử lý sự kiện socket khi lời mời đã gửi được cập nhật
    onFriendRequestSent: (state, action) => {
      const newSentRequest = action.payload;
      // Kiểm tra trùng lặp trước khi thêm
      if (!state.sentRequests.some(req => req.id === newSentRequest.id)) {
        state.sentRequests.unshift(newSentRequest);
      }
    },
    // Xử lý sự kiện socket khi trạng thái tình bạn thay đổi (chấp nhận, từ chối, hủy)
    onFriendshipStatusUpdated: (state, action) => {
      const { type, friendshipId, friendId, friend, senderId, receiverId } = action.payload;

      switch (type) {
        case 'accepted': {
          state.pendingRequests = state.pendingRequests.filter(req => req.id !== friendshipId);
          state.sentRequests = state.sentRequests.filter(req => req.id !== friendshipId);
          if (friend && !state.friends.some(f => f.id === friend.id)) {
            state.friends.unshift(friend);
          }
          break;
        }
        case 'rejected': {
          state.pendingRequests = state.pendingRequests.filter(req => req.id !== friendshipId);
          state.sentRequests = state.sentRequests.filter(req => req.id !== friendshipId);
          break;
        }
        case 'removed': {
          // Xóa khỏi danh sách bạn bè
          state.friends = state.friends.filter(f => f.id !== friendId);
          break;
        }
        default:
          break;
      }
      // Cập nhật trạng thái trong searchResults nếu có
      state.searchResults = state.searchResults.map(user => {
        if (user.id === friendId || user.id === senderId || user.id === receiverId) {
          return { ...user, friendshipStatus: type === 'removed' ? 'none' : type };
        }
        return user;
      });
    },
    onUserStatusUpdate: (state, action) => {
      const { userId, online, lastOnline } = action.payload;
      state.friends = state.friends.map(friend =>
        friend.id === userId ? { ...friend, online, lastOnline } : friend
      );
      state.searchResults = state.searchResults.map(user =>
        user.id === userId ? { ...user, online, lastOnline } : user
      );
    },
    clearFriendError: (state) => {
      state.error = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    // Reducers để đánh dấu dữ liệu cần được tải lại
    invalidateFriends: (state) => {
      state.lastFetchedFriends = null;
    },
    invalidatePendingRequests: (state) => {
      state.lastFetchedPendingRequests = null;
    },
    invalidateSentRequests: (state) => {
      state.lastFetchedSentRequests = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Friends
      .addCase(fetchFriends.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.loading = false;
        state.friends = action.payload;
        state.lastFetchedFriends = Date.now();
      })
      .addCase(fetchFriends.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Pending Requests
      .addCase(fetchPendingRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPendingRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingRequests = action.payload;
        state.lastFetchedPendingRequests = Date.now();
      })
      .addCase(fetchPendingRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Sent Requests
      .addCase(fetchSentRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSentRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.sentRequests = action.payload;
        state.lastFetchedSentRequests = Date.now();
      })
      .addCase(fetchSentRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Send Friend Request
      .addCase(sendFriendRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendFriendRequest.fulfilled, (state, action) => {
        state.loading = false;
        // Cập nhật trạng thái của người dùng trong searchResults
        state.searchResults = state.searchResults.map(user =>
          user.id === action.payload.receiverId ? { ...user, friendshipStatus: 'pending' } : user
        );
        // Thêm vào danh sách lời mời đã gửi
        state.sentRequests.unshift(action.payload);
      })
      .addCase(sendFriendRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Accept Friend Request
      .addCase(acceptFriendRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(acceptFriendRequest.fulfilled, (state, action) => {
        state.loading = false;
        // Xóa khỏi pendingRequests
        state.pendingRequests = state.pendingRequests.filter(
          (req) => req.id !== action.payload.id
        );
        // Thêm vào danh sách bạn bè (nếu chưa có)
        const newFriend = action.payload.sender; // Người gửi lời mời trở thành bạn
        if (newFriend && !state.friends.some(f => f.id === newFriend.id)) {
          state.friends.unshift(newFriend);
        }
        // Cập nhật trạng thái trong searchResults
        state.searchResults = state.searchResults.map(user =>
          user.id === newFriend.id ? { ...user, friendshipStatus: 'accepted' } : user
        );
      })
      .addCase(acceptFriendRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Reject Friend Request
      .addCase(rejectFriendRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectFriendRequest.fulfilled, (state, action) => {
        state.loading = false;
        // Xóa khỏi pendingRequests
        state.pendingRequests = state.pendingRequests.filter(
          (req) => req.id !== action.payload.id
        );
        // Cập nhật trạng thái trong searchResults
        state.searchResults = state.searchResults.map(user =>
          user.id === action.payload.senderId ? { ...user, friendshipStatus: 'rejected' } : user
        );
      })
      .addCase(rejectFriendRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Remove Friend
      .addCase(removeFriend.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFriend.fulfilled, (state, action) => {
        state.loading = false;
        // Xóa khỏi danh sách bạn bè
        state.friends = state.friends.filter((friend) => friend.id !== action.payload);
        // Cập nhật trạng thái trong searchResults
        state.searchResults = state.searchResults.map(user =>
          user.id === action.payload ? { ...user, friendshipStatus: 'none' } : user
        );
      })
      .addCase(removeFriend.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Search Users
      .addCase(searchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.searchResults = []; // Xóa kết quả cũ khi bắt đầu tìm kiếm mới
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.searchResults = [];
      });
  },
});

export const {
  onFriendRequestReceived,
  onFriendRequestSent,
  onFriendshipStatusUpdated,
  onUserStatusUpdate,
  clearFriendError,
  clearSearchResults,
  invalidateFriends,
  invalidatePendingRequests,
  invalidateSentRequests,
} = friendSlice.actions;

export default friendSlice.reducer;
