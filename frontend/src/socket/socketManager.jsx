import { io } from 'socket.io-client';
import { store } from '@/store';
import { onFriendRequestReceived, onFriendRequestSent, onFriendshipStatusUpdated, onUserStatusUpdate, invalidateFriends, invalidatePendingRequests, invalidateSentRequests } from '@/store/slices/friendSlice'; // Import friend-related actions and invalidate actions
import { setCurrentUserOnlineStatus } from '@/store/slices/authSlice'; // Import action to update current user's online status
import { queryClient } from '@/utils/queryClient';

// Sử dụng biến môi trường riêng cho Socket.IO URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

let socket = null;

/**
 * @desc Khởi tạo kết nối Socket.IO
 * @returns {Socket} Đối tượng socket đã kết nối
 */
export const initializeSocket = () => {
  if (socket) {
    console.log('Socket đã được khởi tạo, không khởi tạo lại.');
    return socket;
  }

  const { accessToken } = store.getState().auth;

  socket = io(SOCKET_URL, {
    auth: {
      token: accessToken,
    },
    transports: ['websocket', 'polling'], // Ưu tiên websocket, cho phép fallback sang polling
    reconnectionAttempts: 5, // Thử kết nối lại 5 lần
    reconnectionDelay: 1000, // Độ trễ 1 giây giữa các lần thử
  });

  socket.on('connect', () => {
    console.log('Đã kết nối tới Socket.IO server:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Đã ngắt kết nối khỏi Socket.IO server:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Lỗi kết nối Socket.IO:', err.message);
  });

  socket.on('friendRequestReceived', (data) => {
    store.dispatch(onFriendRequestReceived(data));
    store.dispatch(invalidatePendingRequests()); // Lời mời đang chờ thay đổi
  });

  socket.on('friendRequestSent', (data) => {
    store.dispatch(onFriendRequestSent(data));
    store.dispatch(invalidateSentRequests()); // Lời mời đã gửi thay đổi
  });

  socket.on('friendshipStatusUpdated', (data) => {
    store.dispatch(onFriendshipStatusUpdated(data));
    store.dispatch(invalidateFriends()); // Danh sách bạn bè có thể thay đổi
    store.dispatch(invalidatePendingRequests()); // Lời mời đang chờ có thể thay đổi (khi chấp nhận/từ chối)
    store.dispatch(invalidateSentRequests()); // Lời mời đã gửi có thể thay đổi (khi chấp nhận/từ chối)
  });

  socket.on('user_status_update', (data) => {
    const { userId, online, lastOnline } = data;
    const currentUserId = store.getState().auth.user?.id;

    if (userId === currentUserId) {
      // Update current user's online status in authSlice
      store.dispatch(setCurrentUserOnlineStatus({ online, lastOnline }));
    } else {
      // Update friend's online status in friendSlice
      store.dispatch(onUserStatusUpdate({ userId, online, lastOnline }));
    }
  });

  // === Notification Events (Tích hợp với React Query) ===
  const NOTIFICATION_QUERY_KEYS = {
    all: ['notifications'],
    lists: () => [...NOTIFICATION_QUERY_KEYS.all, 'list'],
    unreadCount: () => [...NOTIFICATION_QUERY_KEYS.all, 'unread-count'],
  };

  // 1. Khi có thông báo mới
  socket.on('notification:new', (newNotification) => {
    console.log('Socket: Nhận thông báo mới', newNotification);
    // Vô hiệu hóa query list để tự động fetch lại, đảm bảo dữ liệu luôn mới nhất
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.lists() });
    // Tăng số lượng chưa đọc trong cache để UI cập nhật ngay lập tức
    queryClient.setQueryData(NOTIFICATION_QUERY_KEYS.unreadCount(), (oldData) => {
      const currentCount = typeof oldData === 'number' ? oldData : 0;
      return currentCount + 1;
    });
  });

  // 2. Khi có cập nhật (ví dụ: đánh dấu đã đọc từ thiết bị khác)
  socket.on('notification:update', ({ id, patch }) => {
    console.log(`Socket: Cập nhật thông báo ${id}`, patch);
    // Cập nhật cache của list notifications
    queryClient.setQueriesData({ queryKey: NOTIFICATION_QUERY_KEYS.lists() }, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map(page => ({
          ...page,
          data: page.data.map(n => (n.id === id ? { ...n, ...patch } : n)),
        })),
      };
    });
    // Đồng bộ lại số lượng chưa đọc
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.unreadCount() });
  });

  // 3. Khi có thông báo bị xóa
  socket.on('notification:delete', ({ id }) => {
    console.log(`Socket: Xóa thông báo ${id}`);
    queryClient.setQueriesData({ queryKey: NOTIFICATION_QUERY_KEYS.lists() }, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map(page => ({
          ...page,
          data: page.data.filter(n => n.id !== id),
        })),
      };
    });
    // Đồng bộ lại số lượng chưa đọc
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.unreadCount() });
  });

  // 4. Khi số lượng chưa đọc thay đổi từ server
  socket.on('notification:unread-count', ({ unread }) => {
    console.log('Socket: Cập nhật số lượng chưa đọc', unread);
    queryClient.setQueryData(NOTIFICATION_QUERY_KEYS.unreadCount(), unread);
  });


  // Comment events
  socket.on('comment_created', (data) => {
    // Invalidate comment queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['comments'] });
    queryClient.invalidateQueries({ queryKey: ['replies'] });
  });

  socket.on('comment_updated', (data) => {
    // Invalidate comment queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['comments'] });
    queryClient.invalidateQueries({ queryKey: ['replies'] });
  });

  socket.on('comment_deleted', (data) => {
    // Invalidate comment queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['comments'] });
    queryClient.invalidateQueries({ queryKey: ['replies'] });
  });

  socket.on('comment_liked', (data) => {
    // Invalidate comment queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['comments'] });
    queryClient.invalidateQueries({ queryKey: ['replies'] });
  });

  return socket;
};

/**
 * @desc Lấy đối tượng socket hiện tại
 * @returns {Socket | null} Đối tượng socket hoặc null nếu chưa khởi tạo
 */
export const getSocket = () => {
  if (!socket) {
    console.warn('Socket chưa được khởi tạo. Vui lòng gọi initializeSocket() trước.');
  }
  return socket;
};

/**
 * @desc Ngắt kết nối Socket.IO
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
