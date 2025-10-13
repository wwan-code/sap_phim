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
// @route   GET /api/friends
// @access  Private
const getFriends = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const friends = await friendService.getFriends(userId);
  res.status(200).json({
    data: friends,
    message: 'Lấy danh sách bạn bè thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Lấy danh sách lời mời kết bạn đang chờ (người dùng là receiver)
// @route   GET /api/friends/pending
// @access  Private
const getPendingFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const pendingRequests = await friendService.getPendingFriendRequests(userId);
  res.status(200).json({
    data: pendingRequests,
    message: 'Lấy danh sách lời mời đang chờ thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Lấy danh sách lời mời kết bạn đã gửi (người dùng là sender)
// @route   GET /api/friends/sent
// @access  Private
const getSentFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const sentRequests = await friendService.getSentFriendRequests(userId);
  res.status(200).json({
    data: sentRequests,
    message: 'Lấy danh sách lời mời đã gửi thành công.',
    errors: null,
    meta: null,
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
  const query = req.query.query;
  const currentUserId = req.user.id;

  if (!query) {
    res.status(400);
    throw new Error('Tham số tìm kiếm không được để trống.');
  }

  const users = await friendService.searchUsers(query, currentUserId);
  res.status(200).json({
    data: users,
    message: 'Tìm kiếm người dùng thành công.',
    errors: null,
    meta: null,
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
