import express from 'express';
import * as friendController from '../controllers/friend.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Gửi lời mời kết bạn
router.post('/invite/:userId', verifyToken, friendController.sendFriendRequest);

// Lấy danh sách bạn bè
router.get('/', verifyToken, friendController.getFriends);

// Lấy danh sách lời mời đang chờ (người dùng là receiver)
router.get('/pending', verifyToken, friendController.getPendingFriendRequests);

// Lấy danh sách lời mời đã gửi (người dùng là sender)
router.get('/sent', verifyToken, friendController.getSentFriendRequests);

// Chấp nhận lời mời kết bạn
router.post('/accept/:inviteId', verifyToken, friendController.acceptFriendRequest);

// Từ chối lời mời kết bạn
router.post('/reject/:inviteId', verifyToken, friendController.rejectFriendRequest);

// Hủy kết bạn
router.delete('/remove/:friendId', verifyToken, friendController.removeFriend);

// Tìm kiếm người dùng
router.get('/search', verifyToken, friendController.searchUsers);

export default router;
