import asyncHandler from 'express-async-handler';
import * as userService from '../services/user.service.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Lấy thông tin profile của người dùng
// @route   GET /api/users/me
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = req.user; // req.user được gắn bởi middleware verifyToken
  res.status(200).json({
    data: user,
    message: 'Lấy thông tin profile thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Cập nhật thông tin profile của người dùng
// @route   PUT /api/users/me
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updatedData = req.body;
  const user = await userService.updateUserProfile(userId, updatedData);
  res.status(200).json({
    data: user,
    message: 'Cập nhật profile thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Upload ảnh đại diện (avatar)
// @route   POST /api/users/me/avatar
// @access  Private
const uploadAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  if (!req.file) {
    res.status(400);
    throw new Error('Không có file ảnh được tải lên.');
  }

  // Lấy đường dẫn tuyệt đối của file ảnh
  const avatarUrl = `/uploads/users/${req.file.filename}`;
  const user = await userService.updateUserAvatar(userId, avatarUrl);

  res.status(200).json({
    data: user,
    message: 'Cập nhật ảnh đại diện thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Upload ảnh bìa (cover)
// @route   POST /api/users/me/cover
// @access  Private
const uploadCover = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  if (!req.file) {
    res.status(400);
    throw new Error('Không có file ảnh được tải lên.');
  }

  // Lấy đường dẫn tuyệt đối của file ảnh
  const coverUrl = `/uploads/users/${req.file.filename}`;
  const user = await userService.updateUserCover(userId, coverUrl);

  res.status(200).json({
    data: user,
    message: 'Cập nhật ảnh bìa thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Lấy thông tin profile của người dùng khác theo UUID
// @route   GET /api/users/:uuid
// @access  Public
const getUserByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const user = await userService.getUserByUuid(uuid);
  res.status(200).json({
    data: user,
    message: 'Lấy thông tin người dùng thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Lấy danh sách phim yêu thích của người dùng theo UUID
// @route   GET /api/users/:uuid/favorites
// @access  Public
const getUserFavoritesByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  const result = await userService.getUserFavoritesByUuid(uuid, parseInt(page), parseInt(limit));
  
  res.status(200).json({
    data: result.favorites,
    message: 'Lấy danh sách phim yêu thích thành công.',
    errors: null,
    meta: {
      pagination: result.pagination
    },
  });
});

// @desc    Lấy lịch sử xem phim của người dùng theo UUID
// @route   GET /api/users/:uuid/watch-history
// @access  Public
const getUserWatchHistoryByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  const result = await userService.getUserWatchHistoryByUuid(uuid, parseInt(page), parseInt(limit));
  
  res.status(200).json({
    data: result.watchHistories,
    message: 'Lấy lịch sử xem phim thành công.',
    errors: null,
    meta: {
      pagination: result.pagination
    },
  });
});

// @desc    Lấy danh sách bạn bè của người dùng theo UUID
// @route   GET /api/users/:uuid/friends
// @access  Public
const getUserFriendsByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const friends = await userService.getUserFriendsByUuid(uuid);
  res.status(200).json({
    data: friends,
    message: 'Lấy danh sách bạn bè thành công.',
    errors: null,
    meta: null,
  });
});

export { getProfile, updateProfile, uploadAvatar, uploadCover, getUserByUuid, getUserFavoritesByUuid, getUserWatchHistoryByUuid, getUserFriendsByUuid };
// @desc    Tìm kiếm người dùng theo username (phục vụ mention)
// @route   GET /api/users/search?q=...
// @access  Public
const searchUsers = asyncHandler(async (req, res) => {
  const { q, limit } = req.query;
  const users = await userService.searchUsers(q, parseInt(limit) || 10);
  res.status(200).json({
    data: users,
    message: 'Tìm kiếm người dùng thành công.',
    errors: null,
    meta: null,
  });
});

export { searchUsers };

// @desc    Tìm kiếm chỉ trong danh sách bạn bè của user hiện tại
// @route   GET /api/users/search/friends?q=...
// @access  Private
const searchFriends = asyncHandler(async (req, res) => {
  const { q, limit } = req.query;
  const users = await userService.searchFriendsByUserId(req.user.id, q, parseInt(limit) || 10);
  res.status(200).json({
    data: users,
    message: 'Tìm kiếm bạn bè thành công.',
    errors: null,
    meta: null,
  });
});

export { searchFriends };
