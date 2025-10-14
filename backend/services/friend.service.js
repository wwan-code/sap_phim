import db from '../models/index.js';
import { Op } from 'sequelize';
import { getIo } from '../config/socket.js';
import { createNotification } from './notification.service.js';
import { generateNotificationContent } from '../utils/notification.utils.js';
import { redisHelpers } from '../config/redis.js';
import redisClient from '../config/redis.js';
import { REDIS_CHANNELS } from '../config/socket.js';

const { User, Friendship } = db;

/**
 * @desc Gửi lời mời kết bạn
 * @param {number} senderId - ID của người gửi lời mời
 * @param {number} receiverId - ID của người nhận lời mời
 * @returns {Promise<Friendship>} Đối tượng Friendship đã tạo
 */
const sendFriendRequest = async (senderId, receiverId) => {
  if (senderId === receiverId) {
    throw new Error('Không thể gửi lời mời kết bạn cho chính mình.');
  }

  // Sử dụng transaction để đảm bảo tính nhất quán dữ liệu
  const friendship = await db.sequelize.transaction(async (t) => {
    // Kiểm tra xem người nhận có tồn tại không
    const sender = await User.findByPk(senderId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'], transaction: t });
    const receiver = await User.findByPk(receiverId, { 
      attributes: ['id', 'uuid', 'username', 'avatarUrl', 'canReceiveFriendRequests'], 
      transaction: t 
    });
    if (!receiver) {
      throw new Error('Người nhận không tồn tại.');
    }

    // Check if receiver allows friend requests
    if (receiver.canReceiveFriendRequests === 'nobody') {
      throw new Error('Người dùng này không nhận lời mời kết bạn.');
    }

    // Check if sender is friend of receiver's friends (for friends_of_friends setting)
    if (receiver.canReceiveFriendRequests === 'friends_of_friends') {
      // Check if they have mutual friends
      const mutualFriendsCount = await db.sequelize.query(`
        SELECT COUNT(DISTINCT sf.mutual_friend_id) as count
        FROM (
          SELECT CASE 
            WHEN f1.senderId = :senderId THEN f1.receiverId
            WHEN f1.receiverId = :senderId THEN f1.senderId
          END as mutual_friend_id
          FROM Friendships f1
          WHERE (f1.senderId = :senderId OR f1.receiverId = :senderId)
          AND f1.status = 'accepted'
        ) AS sf
        INNER JOIN (
          SELECT CASE 
            WHEN f2.senderId = :receiverId THEN f2.receiverId
            WHEN f2.receiverId = :receiverId THEN f2.senderId
          END as mutual_friend_id
          FROM Friendships f2
          WHERE (f2.senderId = :receiverId OR f2.receiverId = :receiverId)
          AND f2.status = 'accepted'
        ) AS rf
        ON sf.mutual_friend_id = rf.mutual_friend_id
      `, {
        replacements: { senderId, receiverId },
        type: db.sequelize.QueryTypes.SELECT,
        transaction: t
      });

      console.log("mutualFriendsCount", mutualFriendsCount);

      if (!mutualFriendsCount || mutualFriendsCount[0].count === 0) {
        throw new Error('Người dùng này chỉ nhận lời mời kết bạn từ bạn của bạn bè.');
      }
    }

    // Kiểm tra xem đã có lời mời nào giữa hai người chưa
    const existingFriendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { senderId: senderId, receiverId: receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
      transaction: t,
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'pending') {
        throw new Error('Lời mời kết bạn đã được gửi và đang chờ phản hồi.');
      } else if (existingFriendship.status === 'accepted') {
        throw new Error('Hai bạn đã là bạn bè.');
      } else if (existingFriendship.status === 'rejected' || existingFriendship.status === 'cancelled') {
        // Nếu đã từ chối hoặc hủy, có thể tạo lại lời mời mới hoặc cập nhật trạng thái
        // Ở đây, chúng ta sẽ tạo một lời mời mới để đơn giản
        await existingFriendship.destroy({ transaction: t }); // Xóa lời mời cũ để tạo mới
      }
    }

    const newFriendship = await Friendship.create({
      senderId,
      receiverId,
      status: 'pending',
    }, { transaction: t });

    // Invalidate cache cho người gửi và người nhận
    // Xóa cache danh sách bạn bè của người gửi và người nhận
    await redisHelpers.safeDel(`user:${senderId}:friends`);
    await redisHelpers.safeDel(`user:${receiverId}:friends`);
    // Xóa cache tìm kiếm của người gửi và người nhận
    await redisHelpers.invalidatePattern(`search:users:${senderId}:*`);
    await redisHelpers.invalidatePattern(`search:users:${receiverId}:*`);

    return newFriendship;
  });

  // Lấy thông tin người gửi và người nhận sau khi transaction thành công
  const sender = await User.findByPk(senderId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });
  const receiver = await User.findByPk(receiverId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });

  const io = getIo();
  const friendRequestData = {
    id: friendship.id,
    senderId: senderId,
    sender: sender,
    receiverId: receiverId,
    receiver: receiver,
    status: 'pending',
    createdAt: friendship.createdAt,
  };

  // Emit trực tiếp cho người nhận và người gửi
  io.to(`user_${receiverId}`).emit('friendRequestReceived', friendRequestData);
  io.to(`user_${senderId}`).emit('friendRequestSent', friendRequestData);

  // Publish lên Redis Pub/Sub để các server khác cũng nhận được
  if (redisClient.status === 'ready') {
    await redisClient.publish(REDIS_CHANNELS.FRIEND_REQUEST, JSON.stringify(friendRequestData));
  }

  // Tạo thông báo cho người nhận
  const { title, body } = generateNotificationContent('friend_request', { senderName: sender.username });
  await createNotification({
    userId: receiverId,
    type: 'friend_request',
    title,
    body,
    link: `/profile/${sender.uuid}`,
    senderId,
    metadata: { friendshipId: friendship.id }
  });

  return friendship;
};

/**
 * @desc Lấy danh sách bạn bè (status: 'accepted') với pagination
 * @param {number} userId - ID của người dùng
 * @param {string} query - Tìm kiếm theo username (optional)
 * @param {number} page - Số trang (default: 1)
 * @param {number} limit - Số lượng items per page (default: 10)
 * @returns {Promise<Object>} Object chứa data và meta pagination
 */
const getFriends = async (userId, query = null, page = 1, limit = 10) => {
  try {
    // Validate inputs
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 10)); // Max 50 per page
    const offset = (validPage - 1) * validLimit;

    // Build cache key with pagination
    const cacheKey = `user:${userId}:friends:${query || 'all'}:${validPage}:${validLimit}`;
    
    // Try cache first (only for first page without query)
    if (validPage === 1 && !query) {
      const cachedFriends = await redisHelpers.safeGet(cacheKey);
      if (cachedFriends) {
        return cachedFriends;
      }
    }

    // Fetch from DB with pagination
    const whereCondition = {
      [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      status: 'accepted',
    };

    // Count total friends
    const totalFriendships = await Friendship.count({ where: whereCondition });

    // Fetch friendships with pagination
    const friendships = await Friendship.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'uuid', 'username', 'avatarUrl', 'online', 'lastOnline'],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'uuid', 'username', 'avatarUrl', 'online', 'lastOnline'],
        },
      ],
      limit: validLimit,
      offset: offset,
      order: [['createdAt', 'DESC']],
    });

    // Extract friend info
    let friends = friendships.map((f) => {
      return f.senderId === userId ? f.receiver.get({ plain: true }) : f.sender.get({ plain: true });
    });

    // Apply search filter if query provided
    if (query && query.trim()) {
      const qLower = query.toLowerCase().trim();
      friends = friends.filter((u) => (u?.username || '').toLowerCase().includes(qLower));
    }

    // Remove duplicates by id
    const uniqueById = new Map();
    for (const u of friends) {
      if (!uniqueById.has(u.id)) uniqueById.set(u.id, u);
    }

    const uniqueFriends = Array.from(uniqueById.values());
    const totalPages = Math.ceil(totalFriendships / validLimit);
    const hasMore = validPage < totalPages;

    const result = {
      data: uniqueFriends,
      meta: {
        page: validPage,
        limit: validLimit,
        total: totalFriendships,
        totalPages: totalPages,
        hasMore: hasMore,
      },
    };

    // Cache result for 5 minutes (only first page without query)
    if (validPage === 1 && !query) {
      await redisHelpers.safeSet(cacheKey, result, 300);
    }

    return result;
  } catch (error) {
    console.error('Error in getFriends:', error);
    throw error;
  }
};

/**
 * @desc Lấy danh sách lời mời kết bạn đang chờ (người dùng là receiver) với pagination
 * @param {number} userId - ID của người dùng
 * @param {number} page - Số trang (default: 1)
 * @param {number} limit - Số lượng items per page (default: 10)
 * @returns {Promise<Object>} Object chứa data và meta pagination
 */
const getPendingFriendRequests = async (userId, page = 1, limit = 10) => {
  try {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (validPage - 1) * validLimit;

    const whereCondition = {
      receiverId: userId,
      status: 'pending',
    };

    // Count total
    const total = await Friendship.count({ where: whereCondition });

    // Fetch with pagination
    const pendingRequests = await Friendship.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'uuid', 'username', 'avatarUrl', 'online', 'lastOnline'],
        },
      ],
      limit: validLimit,
      offset: offset,
      order: [['createdAt', 'DESC']],
    });

    const totalPages = Math.ceil(total / validLimit);

    return {
      data: pendingRequests,
      meta: {
        page: validPage,
        limit: validLimit,
        total: total,
        totalPages: totalPages,
        hasMore: validPage < totalPages,
      },
    };
  } catch (error) {
    console.error('Error in getPendingFriendRequests:', error);
    throw error;
  }
};

/**
 * @desc Lấy danh sách lời mời kết bạn đã gửi (người dùng là sender) với pagination
 * @param {number} userId - ID của người dùng
 * @param {number} page - Số trang (default: 1)
 * @param {number} limit - Số lượng items per page (default: 10)
 * @returns {Promise<Object>} Object chứa data và meta pagination
 */
const getSentFriendRequests = async (userId, page = 1, limit = 10) => {
  try {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (validPage - 1) * validLimit;

    const whereCondition = {
      senderId: userId,
      status: 'pending',
    };

    // Count total
    const total = await Friendship.count({ where: whereCondition });

    // Fetch with pagination
    const sentRequests = await Friendship.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'uuid', 'username', 'avatarUrl', 'online', 'lastOnline'],
        },
      ],
      limit: validLimit,
      offset: offset,
      order: [['createdAt', 'DESC']],
    });

    const totalPages = Math.ceil(total / validLimit);

    return {
      data: sentRequests,
      meta: {
        page: validPage,
        limit: validLimit,
        total: total,
        totalPages: totalPages,
        hasMore: validPage < totalPages,
      },
    };
  } catch (error) {
    console.error('Error in getSentFriendRequests:', error);
    throw error;
  }
};

/**
 * @desc Chấp nhận lời mời kết bạn
 * @param {number} userId - ID của người dùng (người chấp nhận)
 * @param {number} inviteId - ID của lời mời kết bạn
 * @returns {Promise<Friendship>} Đối tượng Friendship đã cập nhật
 */
const acceptFriendRequest = async (userId, inviteId) => {
  // Sử dụng transaction để đảm bảo tính nhất quán dữ liệu
  const friendship = await db.sequelize.transaction(async (t) => {
    const existingFriendship = await Friendship.findOne({
      where: {
        id: inviteId,
        receiverId: userId,
        status: 'pending',
      },
      transaction: t,
    });

    if (!existingFriendship) {
      throw new Error('Lời mời kết bạn không tồn tại hoặc không thể chấp nhận.');
    }

    existingFriendship.status = 'accepted';
    await existingFriendship.save({ transaction: t });

    // Invalidate cache cho cả hai người dùng
    // Xóa cache danh sách bạn bè của người gửi và người nhận
    await redisHelpers.safeDel(`user:${existingFriendship.senderId}:friends`);
    await redisHelpers.safeDel(`user:${existingFriendship.receiverId}:friends`);
    // Xóa cache tìm kiếm của người gửi và người nhận
    await redisHelpers.invalidatePattern(`search:users:${existingFriendship.senderId}:*`);
    await redisHelpers.invalidatePattern(`search:users:${existingFriendship.receiverId}:*`);

    return existingFriendship;
  });

  // Lấy thông tin người gửi và người nhận sau khi transaction thành công
  const sender = await User.findByPk(friendship.senderId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });
  const receiver = await User.findByPk(friendship.receiverId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });

  const io = getIo();
  const friendshipUpdateData = {
    type: 'accepted',
    friendshipId: friendship.id,
    senderId: friendship.senderId,
    receiverId: friendship.receiverId,
    friend: receiver, // Đối với sender, friend là receiver
    friendOfSender: receiver,
    friendOfReceiver: sender,
  };

  // Emit trực tiếp cho người gửi và người nhận
  io.to(`user_${friendship.senderId}`).emit('friendshipStatusUpdated', { ...friendshipUpdateData, friend: receiver });
  io.to(`user_${friendship.receiverId}`).emit('friendshipStatusUpdated', { ...friendshipUpdateData, friend: sender });

  // Publish lên Redis Pub/Sub
  if (redisClient.status === 'ready') {
    await redisClient.publish(REDIS_CHANNELS.FRIENDSHIP_UPDATE, JSON.stringify(friendshipUpdateData));
  }

  // Tạo thông báo cho người gửi yêu cầu
  const { title, body } = generateNotificationContent('friend_request_status', {
    senderName: receiver.username,
    status: 'accepted'
  });
  await createNotification({
    userId: friendship.senderId,
    type: 'friend_request_status',
    title,
    body,
    link: `/profile/${receiver.uuid}`,
    senderId: friendship.receiverId,
    metadata: { friendshipId: friendship.id, status: 'accepted' }
  });

  return friendship;
};

/**
 * @desc Từ chối lời mời kết bạn
 * @param {number} userId - ID của người dùng (người từ chối)
 * @param {number} inviteId - ID của lời mời kết bạn
 * @returns {Promise<Friendship>} Đối tượng Friendship đã cập nhật
 */
const rejectFriendRequest = async (userId, inviteId) => {
  // Sử dụng transaction để đảm bảo tính nhất quán dữ liệu
  const friendship = await db.sequelize.transaction(async (t) => {
    const existingFriendship = await Friendship.findOne({
      where: {
        id: inviteId,
        receiverId: userId,
        status: 'pending',
      },
      transaction: t,
    });

    if (!existingFriendship) {
      throw new Error('Lời mời kết bạn không tồn tại hoặc không thể từ chối.');
    }

    existingFriendship.status = 'rejected';
    await existingFriendship.save({ transaction: t });

    // Invalidate cache cho người gửi và người nhận
    // Xóa cache danh sách bạn bè của người gửi và người nhận
    await redisHelpers.safeDel(`user:${existingFriendship.senderId}:friends`);
    await redisHelpers.safeDel(`user:${existingFriendship.receiverId}:friends`);
    // Xóa cache tìm kiếm của người gửi và người nhận
    await redisHelpers.invalidatePattern(`search:users:${existingFriendship.senderId}:*`);
    await redisHelpers.invalidatePattern(`search:users:${existingFriendship.receiverId}:*`);

    return existingFriendship;
  });

  // Lấy thông tin người gửi và người nhận sau khi transaction thành công
  const sender = await User.findByPk(friendship.senderId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });
  const receiver = await User.findByPk(friendship.receiverId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });
  
  const io = getIo();
  const friendshipUpdateData = {
    type: 'rejected',
    friendshipId: friendship.id,
    senderId: friendship.senderId,
    receiverId: friendship.receiverId,
  };

  // Emit trực tiếp cho người gửi và người nhận
  io.to(`user_${friendship.senderId}`).emit('friendshipStatusUpdated', friendshipUpdateData);
  io.to(`user_${friendship.receiverId}`).emit('friendshipStatusUpdated', friendshipUpdateData);

  // Publish lên Redis Pub/Sub
  if (redisClient.status === 'ready') {
    await redisClient.publish(REDIS_CHANNELS.FRIENDSHIP_UPDATE, JSON.stringify(friendshipUpdateData));
  }

  // Tạo thông báo cho người gửi yêu cầu
  const { title, body } = generateNotificationContent('friend_request_status', {
    senderName: receiver.username,
    status: 'rejected'
  });
  await createNotification({
    userId: friendship.senderId,
    type: 'friend_request_status',
    title,
    body,
    link: `/profile/${receiver.uuid}`,
    senderId: friendship.receiverId,
    metadata: { friendshipId: friendship.id, status: 'rejected' }
  });

  return friendship;
};

/**
 * @desc Hủy kết bạn
 * @param {number} userId - ID của người dùng
 * @param {number} friendId - ID của người bạn muốn hủy kết bạn
 * @returns {Promise<void>}
 */
const removeFriend = async (userId, friendId) => {
  // Sử dụng transaction để đảm bảo tính nhất quán dữ liệu
  const friendship = await db.sequelize.transaction(async (t) => {
    const existingFriendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
        status: 'accepted',
      },
      transaction: t,
    });

    if (!existingFriendship) {
      throw new Error('Không tìm thấy tình bạn hoặc không thể hủy kết bạn.');
    }

    await existingFriendship.destroy({ transaction: t });

    // Invalidate cache cho cả hai người dùng
    // Xóa cache danh sách bạn bè của người dùng và người bạn
    await redisHelpers.safeDel(`user:${userId}:friends`);
    await redisHelpers.safeDel(`user:${friendId}:friends`);
    // Xóa cache tìm kiếm của người dùng và người bạn
    await redisHelpers.invalidatePattern(`search:users:${userId}:*`);
    await redisHelpers.invalidatePattern(`search:users:${friendId}:*`);
    
    return existingFriendship;
  });

  const io = getIo();
  const friendshipUpdateData = {
    type: 'removed',
    friendshipId: friendship.id,
    friendId: friendId, // Người bị hủy kết bạn
    userId: userId, // Người thực hiện hành động hủy
  };

  // Emit trực tiếp cho cả hai người dùng
  io.to(`user_${userId}`).emit('friendshipStatusUpdated', friendshipUpdateData);
  io.to(`user_${friendId}`).emit('friendshipStatusUpdated', friendshipUpdateData);

  // Publish lên Redis Pub/Sub
  if (redisClient.status === 'ready') {
    await redisClient.publish(REDIS_CHANNELS.FRIENDSHIP_UPDATE, JSON.stringify(friendshipUpdateData));
  }
};

/**
 * @desc Search users by username, email or uuid with optimized performance
 * @param {string} query - Search query string
 * @param {number} currentUserId - Current user ID to exclude from results
 * @param {object} options - Additional options (limit, offset)
 * @returns {Promise<Array<User>>} List of matching users
 */
const searchUsers = async (query, currentUserId, options = {}) => {
  // Input validation
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid search query');
  }

  if (!currentUserId || !Number.isInteger(currentUserId)) {
    throw new Error('Invalid user ID');
  }

  // Sanitize and trim query
  const sanitizedQuery = query.trim();
  
  if (sanitizedQuery.length === 0) {
    return [];
  }

  if (sanitizedQuery.length > 100) {
    throw new Error('Search query too long (max 100 characters)');
  }

  const limit = Math.min(options.limit || 10, 50); // Max 50 results
  const offset = options.offset || 0;

  // Check Redis cache first
  const cacheKey = `search:users:${currentUserId}:${sanitizedQuery}:${limit}:${offset}`;
  const cached = await redisHelpers.safeGet(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Check if query is a valid UUID format
    const isUuidQuery = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sanitizedQuery);

    // Build optimized where clause
    const whereCondition = {
      id: { [Op.ne]: currentUserId },
      status: 'active', // Only search active users
      [Op.or]: isUuidQuery
        ? [{ uuid: sanitizedQuery }] // Exact UUID match
        : [
            { username: { [Op.like]: `%${sanitizedQuery}%` } },
            { email: { [Op.like]: `%${sanitizedQuery}%` } },
          ],
    };

    // SOLUTION 1: Use separate query with JOIN (recommended for better performance)
    const users = await User.findAll({
      where: whereCondition,
      attributes: [
        'id',
        'uuid',
        'username',
        'email',
        'avatarUrl',
        'online',
        'lastOnline',
      ],
      include: [
        {
          model: Friendship,
          as: 'sentFriendRequests',
          required: false,
          where: { receiverId: currentUserId },
          attributes: ['status'],
        },
        {
          model: Friendship,
          as: 'receivedFriendRequests',
          required: false,
          where: { senderId: currentUserId },
          attributes: ['status'],
        },
      ],
      limit,
      offset,
      raw: false,
      subQuery: false, // Optimize query execution
    });

    // Transform results to include friendship status
    const results = users.map(user => {
      const userData = user.get({ plain: true });
      
      // Determine friendship status from relationships
      let friendshipStatus = 'none';
      
      if (userData.sentFriendRequests?.length > 0) {
        friendshipStatus = userData.sentFriendRequests[0].status;
      } else if (userData.receivedFriendRequests?.length > 0) {
        friendshipStatus = userData.receivedFriendRequests[0].status;
      }

      // Clean up response
      delete userData.sentFriendRequests;
      delete userData.receivedFriendRequests;

      return {
        ...userData,
        friendshipStatus,
      };
    });

    // Cache results for 2 minutes
    await redisHelpers.safeSet(cacheKey, results, 120);

    return results;

  } catch (error) {
    console.error('Error in searchUsers:', error);
    throw new Error('Failed to search users');
  }
};

export {
  sendFriendRequest,
  getFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
};
