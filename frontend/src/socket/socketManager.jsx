import { io } from 'socket.io-client';
import { store } from '@/store';
import { onUserStatusUpdate } from '@/store/slices/friendSlice';
import { setCurrentUserOnlineStatus } from '@/store/slices/authSlice';
import { queryClient } from '@/utils/queryClient';
import { friendQueryKeys } from '@/hooks/useFriendQueries';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

let socket = null;
let handlersRegistered = false;

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;

const eventQueue = [];
let isProcessingQueue = false;

const NOTIFICATION_QUERY_KEYS = {
  all: ['notifications'],
  lists: () => [...NOTIFICATION_QUERY_KEYS.all, 'list'],
  unreadCount: () => [...NOTIFICATION_QUERY_KEYS.all, 'unread-count'],
};

const getCurrentUserId = () => store.getState().auth.user?.id ?? null;

const debounce = (fn, wait = 300) => {
  let timeoutId = null;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
};

const batchInvalidate = (() => {
  const pending = new Set();
  let timerId = null;

  return (queryKey) => {
    pending.add(JSON.stringify(queryKey));

    if (timerId) {
      return;
    }

    timerId = setTimeout(() => {
      pending.forEach((serializedKey) => {
        const key = JSON.parse(serializedKey);
        queryClient.invalidateQueries({ queryKey: key });
      });
      pending.clear();
      timerId = null;
    }, 100);
  };
})();

const optimisticUpdate = {
  notification: (newNotification) => {
    queryClient.setQueryData(
      NOTIFICATION_QUERY_KEYS.unreadCount(),
      (oldData) => {
        const currentCount = typeof oldData === 'number' ? oldData : 0;
        return currentCount + 1;
      }
    );

    queryClient.setQueriesData(
      { queryKey: NOTIFICATION_QUERY_KEYS.lists() },
      (oldData) => {
        if (!oldData?.pages) {
          return oldData;
        }

        return {
          ...oldData,
          pages: oldData.pages.map((page, index) => {
            if (index === 0) {
              const existing = Array.isArray(page.data) ? page.data : [];
              return {
                ...page,
                data: [newNotification, ...existing],
              };
            }
            return page;
          }),
        };
      }
    );
  },
  comment: (() => {
    const invalidate = debounce(() => {
      batchInvalidate(['comments']);
      batchInvalidate(['replies']);
    }, 500);

    return () => invalidate();
  })(),
  userStatus: (userId, online, lastOnline) => {
    const currentUserId = getCurrentUserId();

    if (userId === currentUserId) {
      store.dispatch(setCurrentUserOnlineStatus({ online, lastOnline }));
      return;
    }

    store.dispatch(onUserStatusUpdate({ userId, online, lastOnline }));
  },
};

const processEventQueue = () => {
  if (isProcessingQueue || eventQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;
  while (eventQueue.length > 0) {
    const { event, handler, data } = eventQueue.shift();
    try {
      handler(data);
    } catch (error) {
      console.error(`Socket queue handler failed for event ${event}:`, error);
    }
  }
  isProcessingQueue = false;
};

const queueEvent = (event, handler, data) => {
  eventQueue.push({ event, handler, data });
  if (socket?.connected) {
    processEventQueue();
  }
};

const handleNotificationPatch = (id, patch) => {
  queryClient.setQueriesData(
    { queryKey: NOTIFICATION_QUERY_KEYS.lists() },
    (oldData) => {
      if (!oldData?.pages) {
        return oldData;
      }

      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          data: Array.isArray(page.data)
            ? page.data.map((notification) =>
                notification.id === id ? { ...notification, ...patch } : notification
              )
            : page.data,
        })),
      };
    }
  );
};

const handleNotificationDelete = (id) => {
  queryClient.setQueriesData(
    { queryKey: NOTIFICATION_QUERY_KEYS.lists() },
    (oldData) => {
      if (!oldData?.pages) {
        return oldData;
      }

      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          data: Array.isArray(page.data)
            ? page.data.filter((notification) => notification.id !== id)
            : page.data,
        })),
      };
    }
  );
};

const markNotificationsAsRead = () => {
  queryClient.setQueriesData(
    { queryKey: NOTIFICATION_QUERY_KEYS.lists() },
    (oldData) => {
      if (!oldData?.pages) {
        return oldData;
      }

      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          data: Array.isArray(page.data)
            ? page.data.map((notification) => ({ ...notification, isRead: true }))
            : page.data,
        })),
      };
    }
  );

  queryClient.setQueryData(NOTIFICATION_QUERY_KEYS.unreadCount(), 0);
};

const attachEventHandlers = () => {
  if (!socket || handlersRegistered) {
    return;
  }

  handlersRegistered = true;

  // Notification events
  socket.on('notification:new', (notification) => {
    queueEvent('notification:new', () => optimisticUpdate.notification(notification), notification);
  });

  socket.on('notification:patch', ({ id, patch }) => {
    queueEvent('notification:patch', () => handleNotificationPatch(id, patch), { id, patch });
  });

  socket.on('notification:delete', ({ id }) => {
    queueEvent('notification:delete', () => handleNotificationDelete(id), { id });
    batchInvalidate(NOTIFICATION_QUERY_KEYS.lists());
    batchInvalidate(NOTIFICATION_QUERY_KEYS.unreadCount());
  });

  socket.on('notification:unread-count', ({ unread }) => {
    queueEvent(
      'notification:unread-count',
      () => queryClient.setQueryData(NOTIFICATION_QUERY_KEYS.unreadCount(), unread ?? 0),
      { unread }
    );
  });

  socket.on('notification:all-cleared', () => {
    queueEvent('notification:all-cleared', () => markNotificationsAsRead(), null);
  });

  socket.on('notification:all-read', () => {
    queueEvent('notification:all-read', () => markNotificationsAsRead(), null);
  });

  // Friend request lifecycle events
  socket.on('friend:request', (payload) => {
    queueEvent('friend:request', () => {
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.pending() });
    }, payload);
  });

  socket.on('friend:request:sent', (payload) => {
    queueEvent('friend:request:sent', () => {
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.sent() });
    }, payload);
  });

  socket.on('friendship:update', (payload) => {
    queueEvent('friendship:update', () => {
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.pending() });
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.sent() });
      queryClient.invalidateQueries({ queryKey: friendQueryKeys.search('') });
    }, payload);
  });

  // User status updates
  socket.on('user_status_update', (data) => {
    queueEvent('user_status_update', () => {
      optimisticUpdate.userStatus(data.userId, data.online, data.lastOnline);
    }, data);
  });

  // Comment activity events
  const commentEvents = ['comment_created', 'comment_updated', 'comment_deleted', 'comment_liked'];
  commentEvents.forEach((event) => {
    socket.on(event, (data) => {
      queueEvent(event, () => optimisticUpdate.comment(data, event), data);
    });
  });
};

export const initializeSocket = () => {
  if (socket) {
    return socket;
  }

  const { accessToken } = store.getState().auth;

  if (!accessToken) {
    console.warn('Cannot initialise socket without an access token.');
    return null;
  }

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: RECONNECT_DELAY,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    socket.emit('notification:subscribe');
    processEventQueue();
  });

  socket.on('disconnect', (reason) => {
    console.warn('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  socket.io.on('reconnect', () => {
    processEventQueue();
  });

  attachEventHandlers();

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn('Socket has not been initialised. Call initializeSocket() first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  handlersRegistered = false;
  eventQueue.length = 0;
};

export const isSocketConnected = () => Boolean(socket?.connected);

export const emitSocketEvent = (event, data) => {
  if (socket?.connected) {
    socket.emit(event, data);
    return;
  }

  console.warn(`Socket offline; queueing event: ${event}`);
  queueEvent(event, () => socket?.emit(event, data), data);
};
