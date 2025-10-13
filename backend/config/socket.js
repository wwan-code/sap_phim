import { Server } from 'socket.io';

let ioInstance = null;

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true
    }
  });

  const connectedUsers = new Map(); // userId -> socketId

  ioInstance.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (userId) {
      connectedUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);
    }

    socket.on('reel:join', (reelId) => {
      if (!reelId) return;
      socket.join(`reel:${reelId}`);
    });

    socket.on('reel:leave', (reelId) => {
      if (!reelId) return;
      socket.leave(`reel:${reelId}`);
    });

    socket.on('disconnect', () => {
      if (userId) {
        connectedUsers.delete(userId);
      }
    });
  });

  return ioInstance;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO chưa được khởi tạo');
  }
  return ioInstance;
};

export const emitToFollowers = (followerIds, event, payload) => {
  const io = getIO();
  followerIds.forEach((id) => {
    io.to(`user:${id}`).emit(event, payload);
  });
};

export const emitToReelRoom = (reelId, event, payload) => {
  const io = getIO();
  io.to(`reel:${reelId}`).emit(event, payload);
};

export const broadcastEvent = (event, payload) => {
  const io = getIO();
  io.emit(event, payload);
};
