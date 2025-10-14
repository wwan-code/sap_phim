import asyncHandler from 'express-async-handler';
import * as friendService from '../services/friend.service.js';

// @desc    Gửi lời mời kết bạn
// @route   POST /api/friends/invite/:userId
// @access  Private
const sendFriendRequest = asyncHandler(async (req, res) => {
  const senderId = req.user.id;
  const receiverId = parseInt(req.params.userId);

  const friendship = await friendService.sendFriendRequest(senderId, receiverId);
  res.status(201).json({
    data: friendship,
    message: 'Lời mời kết bạn đã được gửi.',
    errors: null,
    meta: null,
  });
});

// @desc    Lấy danh sách bạn bè
// @route   GET /api/friends?page=1&limit=10&q=search
// @access  Private
const getFriends = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { q, page = 1, limit = 10 } = req.query;
  const result = await friendService.getFriends(
    userId, 
    q, 
    parseInt(page), 
    parseInt(limit)
  );
  res.status(200).json({
    data: result.data,
    message: 'Lấy danh sách bạn bè thành công.',
    errors: null,
    meta: result.meta,
  });
});

// @desc    Lấy danh sách lời mời kết bạn đang chờ (người dùng là receiver)
// @route   GET /api/friends/pending?page=1&limit=10
// @access  Private
const getPendingFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  const result = await friendService.getPendingFriendRequests(
    userId, 
    parseInt(page), 
    parseInt(limit)
  );
  res.status(200).json({
    data: result.data,
    message: 'Lấy danh sách lời mời đang chờ thành công.',
    errors: null,
    meta: result.meta,
  });
});

// @desc    Lấy danh sách lời mời kết bạn đã gửi (người dùng là sender)
// @route   GET /api/friends/sent?page=1&limit=10
// @access  Private
const getSentFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  const result = await friendService.getSentFriendRequests(
    userId, 
    parseInt(page), 
    parseInt(limit)
  );
  res.status(200).json({
    data: result.data,
    message: 'Lấy danh sách lời mời đã gửi thành công.',
    errors: null,
    meta: result.meta,
  });
});

// @desc    Chấp nhận lời mời kết bạn
// @route   POST /api/friends/accept/:inviteId
// @access  Private
const acceptFriendRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const inviteId = parseInt(req.params.inviteId);

  const friendship = await friendService.acceptFriendRequest(userId, inviteId);
  res.status(200).json({
    data: friendship,
    message: 'Lời mời kết bạn đã được chấp nhận.',
    errors: null,
    meta: null,
  });
});

// @desc    Từ chối lời mời kết bạn
// @route   POST /api/friends/reject/:inviteId
// @access  Private
const rejectFriendRequest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const inviteId = parseInt(req.params.inviteId);

  const friendship = await friendService.rejectFriendRequest(userId, inviteId);
  res.status(200).json({
    data: friendship,
    message: 'Lời mời kết bạn đã bị từ chối.',
    errors: null,
    meta: null,
  });
});

// @desc    Hủy kết bạn
// @route   DELETE /api/friends/remove/:friendId
// @access  Private
const removeFriend = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const friendId = parseInt(req.params.friendId);

  await friendService.removeFriend(userId, friendId);
  res.status(200).json({
    data: null,
    message: 'Đã hủy kết bạn thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Tìm kiếm người dùng
// @route   GET /api/friends/search?query=...
// @access  Private
const searchUsers = asyncHandler(async (req, res) => {
  const { query, limit = 10, offset = 0 } = req.query;
  const currentUserId = req.user.id;

  const users = await friendService.searchUsers(query, currentUserId, {
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.status(200).json({
    data: users,
    message: 'Tìm kiếm người dùng thành công.',
    errors: null,
    meta: {
      total: users.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: users.length === parseInt(limit),
    },
  });
});

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
