import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import { Op } from 'sequelize';
import * as NotificationService from '../services/notification.service.js';
import redisClient, { redisHelpers } from './redis.js';

const { User, Friendship } = db;

let ioInstance;
const connectedUsers = new Map();
const userSockets = new Map();
let redisSubscriber = null; // Track subscriber for cleanup

export const REDIS_CHANNELS = {
  USER_STATUS: 'user:status',
  NOTIFICATION: 'user:notification',
  COMMENT: 'comment:update',
  FRIEND_REQUEST: 'friend:request',
  FRIENDSHIP_UPDATE: 'friendship:update',
  REEL_PUBLISHED: 'reel:published',
  REEL_LIKED: 'reel:liked',
  REEL_COMMENTED: 'reel:commented',
  REEL_VIEWED: 'reel:viewed',
  REEL_DELETED: 'reel:deleted',
  REEL_FAILED: 'reel:failed',
  ADMIN_REEL_UPDATED: 'admin:reel_updated',
  ADMIN_REEL_DELETED: 'admin:reel_deleted',
};

/**
 * Verify JWT token from socket handshake
 */
const verifySocketToken = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.userId = decoded.id;
    next();
  });
};

/**
 * Batch emit helper with automatic flushing
 */
const createBatchEmitter = () => {
  const batches = new Map();
  let timeoutId = null;

  const flush = () => {
    if (!ioInstance) return;
    
    batches.forEach((events, room) => {
      if (events.length > 0) {
        try {
          ioInstance.to(room).emit('batch:events', events);
        } catch (error) {
          console.error(`Error emitting batch events to room ${room}:`, error);
        }
      }
    });
    batches.clear();
    timeoutId = null;
  };

  const emit = (room, eventName, data) => {
    if (!batches.has(room)) {
      batches.set(room, []);
    }
    batches.get(room).push({ event: eventName, data, timestamp: Date.now() });

    if (!timeoutId) {
      timeoutId = setTimeout(flush, 50);
    }
  };

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    batches.clear();
  };

  return { emit, flush, cleanup };
};

const batchEmitter = createBatchEmitter();

/**
 * Invalidate friend IDs cache
 */
const FRIEND_IDS_CACHE_KEY = (userId) => `friends:${userId}`;

const invalidateFriendIdsCache = async (userId) => {
  const cacheKey = FRIEND_IDS_CACHE_KEY(userId);
  await redisHelpers.safeDel(cacheKey);
  console.log(`Redis cache for friend IDs of user ${userId} invalidated.`);
};

const getFriendIds = async (userId) => {
  const cacheKey = FRIEND_IDS_CACHE_KEY(userId);

  return redisHelpers.cache(
    cacheKey,
    async () => {
      const friendships = await Friendship.findAll({
        where: {
          status: 'accepted',
          [Op.or]: [{ senderId: userId }, { receiverId: userId }],
        },
        attributes: ['senderId', 'receiverId'],
        raw: true,
      });

      return friendships.map((friendship) =>
        friendship.senderId === userId ? friendship.receiverId : friendship.senderId
      );
    },
    300
  );
};

/**
 * Broadcast user status with error handling
 */
const broadcastUserStatus = async (userId, online, lastOnline = null) => {
  try {
    const friendIds = await getFriendIds(userId);
    const statusUpdate = { userId, online, lastOnline };

    // Emit to user's own room
    if (ioInstance) {
      ioInstance.to(`user_${userId}`).emit('user_status_update', statusUpdate);

      // Emit to friends using batch emitter
      friendIds.forEach(friendId => {
        batchEmitter.emit(`user_${friendId}`, 'user_status_update', statusUpdate);
      });
    }

    // Publish to Redis for multi-server sync
    if (redisClient.status === 'ready') {
      await redisClient.publish(
        REDIS_CHANNELS.USER_STATUS,
        JSON.stringify({ userId, online, lastOnline, friendIds })
      );
    }
  } catch (error) {
    console.error(`Error broadcasting status for user ${userId}:`, error);
  }
};

/**
 * Setup Redis subscriptions with proper error handling
 */
const setupRedisSubscriptions = () => {
  if (redisClient.status !== 'ready') {
    console.warn('Redis not ready for subscriptions');
    return;
  }

  try {
    // Create subscriber client
    redisSubscriber = redisClient.duplicate();
    
    // Subscribe to all channels
    const channels = Object.values(REDIS_CHANNELS);
    
    redisSubscriber.connect()
      .then(() => {
        console.log('✅ Redis subscriber connected');
        return redisSubscriber.subscribe(channels, (err) => {
          if (err) {
            console.error('Redis subscribe error:', err);
          } else {
            console.log(`✅ Subscribed to ${channels.length} Redis channels`);
          }
        });
      })
      .catch(err => console.error('Redis subscriber connection error:', err));

    // Handle incoming messages
    redisSubscriber.on('message', async (channel, message) => {
      if (!ioInstance) return;

      try {
        const data = JSON.parse(message);
        
        switch (channel) {
          case REDIS_CHANNELS.USER_STATUS:
            handleUserStatusUpdate(data);
            break;
            
          case REDIS_CHANNELS.FRIEND_REQUEST:
            handleFriendRequest(data);
            break;
            
            case REDIS_CHANNELS.FRIENDSHIP_UPDATE:
              await handleFriendshipUpdate(data);
              break;

            case REDIS_CHANNELS.REEL_PUBLISHED:
              handleReelPublished(data);
              break;
            case REDIS_CHANNELS.REEL_LIKED:
              handleReelLiked(data);
              break;
            case REDIS_CHANNELS.REEL_COMMENTED:
              handleReelCommented(data);
              break;
            case REDIS_CHANNELS.REEL_VIEWED:
              handleReelViewed(data);
              break;
            case REDIS_CHANNELS.REEL_DELETED:
              handleReelDeleted(data);
              break;
            case REDIS_CHANNELS.REEL_FAILED:
              handleReelFailed(data);
              break;
            case REDIS_CHANNELS.ADMIN_REEL_UPDATED:
              handleAdminReelUpdated(data);
              break;
            case REDIS_CHANNELS.ADMIN_REEL_DELETED:
              handleAdminReelDeleted(data);
              break;

            default:
              console.log(`Unhandled channel: ${channel}`);
          }
        } catch (error) {
          console.error(`Redis message handling error for channel ${channel}:`, error);
        }
      });

    // Handle Redis subscriber errors
    redisSubscriber.on('error', (err) => {
      console.error('Redis subscriber error:', err);
    });

  } catch (error) {
    console.error('Error setting up Redis subscriptions:', error);
  }
};

/**
 * Channel-specific message handlers
 */
const handleUserStatusUpdate = (data) => {
  const { userId, online, lastOnline, friendIds } = data;
  friendIds.forEach(friendId => {
    ioInstance.to(`user_${friendId}`).emit('user_status_update', {
      userId,
      online,
      lastOnline,
    });
  });
};

const handleFriendRequest = (data) => {
  const { senderId, receiverId, sender, receiver, ...rest } = data;
  ioInstance.to(`user_${receiverId}`).emit('friendRequestReceived', { sender, ...rest });
  ioInstance.to(`user_${senderId}`).emit('friendRequestSent', { receiver, ...rest });
};

const handleFriendshipUpdate = async (data) => {
  const { type, friendshipId, senderId, receiverId, friendOfSender, friendOfReceiver, friendId, userId, ...rest } = data;
  
  // Invalidate caches
  await invalidateFriendIdsCache(senderId);
  await invalidateFriendIdsCache(receiverId);

  if (type === 'accepted') {
    ioInstance.to(`user_${senderId}`).emit('friendshipStatusUpdated', { type, friendshipId, friend: friendOfSender, ...rest });
    ioInstance.to(`user_${receiverId}`).emit('friendshipStatusUpdated', { type, friendshipId, friend: friendOfReceiver, ...rest });
  } else if (type === 'rejected') {
    ioInstance.to(`user_${senderId}`).emit('friendshipStatusUpdated', { type, friendshipId, receiverId, ...rest });
    ioInstance.to(`user_${receiverId}`).emit('friendshipStatusUpdated', { type, friendshipId, senderId, ...rest });
  } else if (type === 'removed') {
    ioInstance.to(`user_${userId}`).emit('friendshipStatusUpdated', { type, friendshipId, friendId: friendId, ...rest });
    ioInstance.to(`user_${friendId}`).emit('friendshipStatusUpdated', { type, friendshipId, friendId: userId, ...rest });
  }
};

/**
 * Reel-specific message handlers
 */
const handleReelPublished = (data) => {
  const { reel, followerIds } = data;
  // Emit to author and all followers
  const recipients = [...new Set([reel.userId, ...followerIds])];
  recipients.forEach((userId) => {
    ioInstance.to(`user_${userId}`).emit('reel:published', reel);
  });
};

const handleReelLiked = (data) => {
  const { reelId, userId, likesCount } = data;
  ioInstance.to(`user_${userId}`).emit('reel:liked', { reelId, userId, likesCount });
};

const handleReelCommented = (data) => {
  const { reelId, comment, commentsCount } = data;
  ioInstance.to(`user_${comment.reelId}`).emit('reel:commented', { reelId, comment, commentsCount });
};

const handleReelViewed = (data) => {
  const { reelId, views } = data;
  ioInstance.emit('reel:viewed', { reelId, views }); // Emit to all connected clients for public view count
};

const handleReelDeleted = (data) => {
  const { reelId, userId } = data;
  ioInstance.emit('reel:deleted', { reelId, userId }); // Emit to all relevant clients
};

const handleReelFailed = (data) => {
  const { reelId, error, userId } = data;
  ioInstance.to(`user_${userId}`).emit('reel:failed', { reelId, error });
};

const handleAdminReelUpdated = (data) => {
  const { reel } = data;
  ioInstance.to('admin_dashboard').emit('admin:reel_updated', reel); // Emit to admin dashboard room
};

const handleAdminReelDeleted = (data) => {
  const { reelId } = data;
  ioInstance.to('admin_dashboard').emit('admin:reel_deleted', { reelId }); // Emit to admin dashboard room
};

/**
 * Initialize Socket.IO with improved configuration
 */
export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
    // Performance optimizations
    perMessageDeflate: false,
    maxHttpBufferSize: 1e6, // 1MB
  });

  // Rate limiting middleware
  ioInstance.use(async (socket, next) => {
    const ip = socket.handshake.address;
    const key = `ratelimit:socket:${ip}`;
    
    try {
      if (redisClient.status === 'ready') {
        const count = await redisClient.incr(key);
        if (count === 1) {
          await redisClient.expire(key, 60);
        }
        if (count > 50) {
          return next(new Error('Too many connection attempts. Please try again later.'));
        }
      }
      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next(); // Allow connection on error
    }
  });

  // Authentication middleware
  ioInstance.use(verifySocketToken);

  // Connection handler
  ioInstance.on('connection', async (socket) => {
    const userId = socket.userId;
    if (!userId) return;

    const userRoom = `user_${userId}`;
    socket.join(userRoom);

    // Track multiple connections per user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    connectedUsers.set(userId, socket.id);

    console.log(`✅ User ${userId} connected (socket: ${socket.id})`);

    // Set user online status
    try {
      await db.sequelize.transaction(async (t) => {
        await User.update(
          { online: true, lastOnline: null },
          { where: { id: userId }, transaction: t }
        );
      });

      await broadcastUserStatus(userId, true, null);
    } catch (error) {
      console.error(`Error setting user ${userId} online:`, error);
    }

    // Notification subscription
    socket.on('notification:subscribe', async () => {
      try {
        const unreadCount = await NotificationService.getUnreadNotificationsCount(userId);
        socket.emit('notification:unread-count', { unread: unreadCount });
      } catch (error) {
        console.error(`Error in notification:subscribe for user ${userId}:`, error);
      }
    });

    // Mark notifications as seen
    socket.on('notification:seen', async (data) => {
      if (data?.ids?.length > 0) {
        try {
          await NotificationService.markMultipleAsRead(data.ids, userId);
        } catch (error) {
          console.error(`Error marking notifications seen for user ${userId}:`, error);
        }
      }
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      console.log(`User ${userId} disconnected (socket: ${socket.id}), reason: ${reason}`);
      
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        
        // Only set offline if no more connections
        if (sockets.size === 0) {
          userSockets.delete(userId);
          connectedUsers.delete(userId);

          try {
            await db.sequelize.transaction(async (t) => {
              await User.update(
                { online: false, lastOnline: new Date() },
                { where: { id: userId }, transaction: t }
              );
            });

            await broadcastUserStatus(userId, false, new Date());
          } catch (error) {
            console.error(`Error setting user ${userId} offline:`, error);
          }
        }
      }
    });

    // Handle socket errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  // Setup Redis subscriptions
  setupRedisSubscriptions();

  // Cleanup interval for stale connections
  const cleanupInterval = setInterval(async () => {
    console.log('🧹 Running stale connection cleanup...');
    const now = new Date();
    const usersToUpdateOffline = [];

    for (const [userId, socketIds] of userSockets.entries()) {
      let hasActiveConnection = false;
      for (const socketId of socketIds) {
        const socket = ioInstance.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
          hasActiveConnection = true;
          break;
        }
      }

      if (!hasActiveConnection) {
        usersToUpdateOffline.push(userId);
        userSockets.delete(userId);
        connectedUsers.delete(userId);
      }
    }

    if (usersToUpdateOffline.length > 0) {
      try {
        await db.sequelize.transaction(async (t) => {
          await User.update(
            { online: false, lastOnline: now },
            { where: { id: { [Op.in]: usersToUpdateOffline } }, transaction: t }
          );
        });
        console.log(`✅ Updated ${usersToUpdateOffline.length} users to offline.`);

        for (const userId of usersToUpdateOffline) {
          await broadcastUserStatus(userId, false, now);
        }
      } catch (error) {
        console.error('Error updating offline status for stale connections:', error);
      }
    }
  }, 60 * 1000); // Run every 1 minute

  // Cleanup on server shutdown
  const cleanup = async () => {
    console.log('🛑 Shutting down Socket.IO...');
    
    // Clear cleanup interval
    clearInterval(cleanupInterval);
    
    // Flush any pending batch events
    batchEmitter.flush();
    batchEmitter.cleanup();
    
    // Close Redis subscriber
    if (redisSubscriber) {
      try {
        await redisSubscriber.unsubscribe();
        await redisSubscriber.quit();
        console.log('✅ Redis subscriber closed');
      } catch (error) {
        console.error('Error closing Redis subscriber:', error);
      }
    }
    
    // Close all socket connections
    if (ioInstance) {
      ioInstance.close();
      console.log('✅ Socket.IO server closed');
    }
  };

  // Register cleanup handlers
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  console.log("✅ Socket.IO initialized successfully");
  return ioInstance;
};

/**
 * Get Socket.IO instance
 */
export const getIo = () => {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized!");
  }
  return ioInstance;
};

/**
 * Emit to specific user (supports multiple connections)
 */
export const emitToUser = (userId, event, data) => {
  if (!ioInstance) return;
  ioInstance.to(`user_${userId}`).emit(event, data);
};

/**
 * Emit to multiple users
 */
export const emitToUsers = (userIds, event, data) => {
  if (!ioInstance || !Array.isArray(userIds)) return;
  userIds.forEach(userId => {
    ioInstance.to(`user_${userId}`).emit(event, data);
  });
};

/**
 * Get online status of multiple users
 */
export const getOnlineUsers = (userIds) => {
  return userIds.filter(userId => connectedUsers.has(userId));
};
