import db from '../models/index.js';
import { Op } from 'sequelize';
import { getIo } from '../config/socket.js';
import { createNotification } from './notification.service.js';
import { generateNotificationContent } from '../utils/notification.utils.js';

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

  // Kiểm tra xem người nhận có tồn tại không
  const sender = await User.findByPk(senderId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });
  const receiver = await User.findByPk(receiverId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });
  if (!receiver) {
    throw new Error('Người nhận không tồn tại.');
  }

  // Kiểm tra xem đã có lời mời nào giữa hai người chưa
  const existingFriendship = await Friendship.findOne({
    where: {
      [Op.or]: [
        { senderId: senderId, receiverId: receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });

  if (existingFriendship) {
    if (existingFriendship.status === 'pending') {
      throw new Error('Lời mời kết bạn đã được gửi và đang chờ phản hồi.');
    } else if (existingFriendship.status === 'accepted') {
      throw new Error('Hai bạn đã là bạn bè.');
    } else if (existingFriendship.status === 'rejected' || existingFriendship.status === 'cancelled') {
      // Nếu đã từ chối hoặc hủy, có thể tạo lại lời mời mới hoặc cập nhật trạng thái
      // Ở đây, chúng ta sẽ tạo một lời mời mới để đơn giản
      await existingFriendship.destroy(); // Xóa lời mời cũ để tạo mới
    }
  }

  const friendship = await Friendship.create({
    senderId,
    receiverId,
    status: 'pending',
  });

  // Gửi sự kiện socket cho người nhận
  const io = getIo();
  
  io.to(`user_${receiverId}`).emit('friendRequestReceived', {
    id: friendship.id,
    senderId: senderId,
    sender: sender,
    status: 'pending',
    createdAt: friendship.createdAt,
  });
  io.to(`user_${senderId}`).emit('friendRequestSent', {
    id: friendship.id,
    receiverId: receiverId,
    receiver: receiver,
    status: 'pending',
    createdAt: friendship.createdAt,
  });

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
 * @desc Lấy danh sách bạn bè (status: 'accepted')
 * @param {number} userId - ID của người dùng
 * @returns {Promise<Array<User>>} Danh sách bạn bè
 */
const getFriends = async (userId) => {
  const friendships = await Friendship.findAll({
    where: {
      [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      status: 'accepted',
    },
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
  });

  // Trích xuất thông tin bạn bè từ friendships
  const friends = friendships.map((f) => {
    return f.senderId === userId ? f.receiver : f.sender;
  });

  return friends;
};

/**
 * @desc Lấy danh sách lời mời kết bạn đang chờ (người dùng là receiver)
 * @param {number} userId - ID của người dùng
 * @returns {Promise<Array<Friendship>>} Danh sách lời mời đang chờ
 */
const getPendingFriendRequests = async (userId) => {
  const pendingRequests = await Friendship.findAll({
    where: {
      receiverId: userId,
      status: 'pending',
    },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'uuid', 'username', 'avatarUrl'],
      },
    ],
  });
  return pendingRequests;
};

/**
 * @desc Lấy danh sách lời mời kết bạn đã gửi (người dùng là sender)
 * @param {number} userId - ID của người dùng
 * @returns {Promise<Array<Friendship>>} Danh sách lời mời đã gửi
 */
const getSentFriendRequests = async (userId) => {
  const sentRequests = await Friendship.findAll({
    where: {
      senderId: userId,
      status: 'pending',
    },
    include: [
      {
        model: User,
        as: 'receiver',
        attributes: ['id', 'uuid', 'username', 'avatarUrl'],
      },
    ],
  });
  return sentRequests;
};

/**
 * @desc Chấp nhận lời mời kết bạn
 * @param {number} userId - ID của người dùng (người chấp nhận)
 * @param {number} inviteId - ID của lời mời kết bạn
 * @returns {Promise<Friendship>} Đối tượng Friendship đã cập nhật
 */
const acceptFriendRequest = async (userId, inviteId) => {
  const friendship = await Friendship.findOne({
    where: {
      id: inviteId,
      receiverId: userId,
      status: 'pending',
    },
  });

  if (!friendship) {
    throw new Error('Lời mời kết bạn không tồn tại hoặc không thể chấp nhận.');
  }

  friendship.status = 'accepted';
  await friendship.save();

  // Gửi sự kiện socket cho cả hai người dùng
  const io = getIo();
  const sender = await User.findByPk(friendship.senderId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });
  const receiver = await User.findByPk(friendship.receiverId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });

  io.to(`user_${friendship.senderId}`).emit('friendshipStatusUpdated', {
    type: 'accepted',
    friendshipId: friendship.id,
    friend: receiver,
  });
  io.to(`user_${friendship.receiverId}`).emit('friendshipStatusUpdated', {
    type: 'accepted',
    friendshipId: friendship.id,
    friend: sender,
  });

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
  const friendship = await Friendship.findOne({
    where: {
      id: inviteId,
      receiverId: userId,
      status: 'pending',
    },
  });

  if (!friendship) {
    throw new Error('Lời mời kết bạn không tồn tại hoặc không thể từ chối.');
  }

  friendship.status = 'rejected';
  await friendship.save();

  // Gửi sự kiện socket cho người gửi
  const io = getIo();
  const sender = await User.findByPk(friendship.senderId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });
  const receiver = await User.findByPk(friendship.receiverId, { attributes: ['id', 'uuid', 'username', 'avatarUrl'] });
  
  io.to(`user_${friendship.senderId}`).emit('friendshipStatusUpdated', {
    type: 'rejected',
    friendshipId: friendship.id,
    receiverId: friendship.receiverId,
  });
  io.to(`user_${friendship.receiverId}`).emit('friendshipStatusUpdated', {
    type: 'rejected',
    friendshipId: friendship.id,
    senderId: friendship.senderId,
  });

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
  const friendship = await Friendship.findOne({
    where: {
      [Op.or]: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
      status: 'accepted',
    },
  });

  if (!friendship) {
    throw new Error('Không tìm thấy tình bạn hoặc không thể hủy kết bạn.');
  }

  await friendship.destroy();

  // Gửi sự kiện socket cho cả hai người dùng
  const io = getIo();
  io.to(`user_${userId}`).emit('friendshipStatusUpdated', {
    type: 'removed',
    friendshipId: friendship.id,
    friendId: friendId,
  });
  io.to(`user_${friendId}`).emit('friendshipStatusUpdated', {
    type: 'removed',
    friendshipId: friendship.id,
    friendId: userId,
  });
};

/**
 * @desc Tìm kiếm người dùng theo username, email hoặc uuid
 * @param {string} query - Chuỗi tìm kiếm
 * @param {number} currentUserId - ID của người dùng hiện tại để loại trừ khỏi kết quả
 * @returns {Promise<Array<User>>} Danh sách người dùng phù hợp
 */
const searchUsers = async (query, currentUserId) => {
  const users = await User.findAll({
    where: {
      id: { [Op.ne]: currentUserId }, // Loại trừ người dùng hiện tại
      [Op.or]: [
        { username: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { uuid: query },
      ],
    },
    attributes: ['id', 'uuid', 'username', 'email', 'avatarUrl'],
    limit: 10, // Giới hạn số lượng kết quả
  });

  // Lấy trạng thái tình bạn giữa người dùng hiện tại và các người dùng tìm thấy
  const userIds = users.map(user => user.id);
  const friendships = await Friendship.findAll({
    where: {
      [Op.or]: [
        { senderId: currentUserId, receiverId: { [Op.in]: userIds } },
        { senderId: { [Op.in]: userIds }, receiverId: currentUserId },
      ],
    },
  });

  const friendshipMap = new Map();
  friendships.forEach(f => {
    const otherUserId = f.senderId === currentUserId ? f.receiverId : f.senderId;
    friendshipMap.set(otherUserId, f.status);
  });

  return users.map(user => ({
    ...user.toJSON(),
    friendshipStatus: friendshipMap.get(user.id) || 'none', // 'none' nếu chưa có tình bạn
  }));
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
