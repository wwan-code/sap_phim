import express from 'express';
import * as friendController from '../controllers/friend.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { validateSendFriendRequest, validateFriendshipAction, validateRemoveFriend, validateSearchUsers } from '../middlewares/friend.validation.js';
import { validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Middleware xử lý kết quả validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Rate limiter cho lời mời kết bạn (ví dụ: 15 lời mời trong 10 phút)
const friendRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 15, // Giới hạn 15 yêu cầu mỗi IP trong 10 phút
  message: 'Bạn đã gửi quá nhiều lời mời kết bạn. Vui lòng thử lại sau.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Gửi lời mời kết bạn
router.post(
  '/invite/:userId',
  verifyToken,
  friendRequestLimiter, // Áp dụng rate limiting
  validateSendFriendRequest,
  handleValidationErrors,
  friendController.sendFriendRequest
);

// Lấy danh sách bạn bè
router.get('/', verifyToken, friendController.getFriends);

// Lấy danh sách lời mời đang chờ (người dùng là receiver)
router.get('/pending', verifyToken, friendController.getPendingFriendRequests);

// Lấy danh sách lời mời đã gửi (người dùng là sender)
router.get('/sent', verifyToken, friendController.getSentFriendRequests);

// Chấp nhận lời mời kết bạn
router.post(
  '/accept/:inviteId',
  verifyToken,
  validateFriendshipAction,
  handleValidationErrors,
  friendController.acceptFriendRequest
);

// Từ chối lời mời kết bạn
router.post(
  '/reject/:inviteId',
  verifyToken,
  validateFriendshipAction,
  handleValidationErrors,
  friendController.rejectFriendRequest
);

// Hủy kết bạn
router.delete(
  '/remove/:friendId',
  verifyToken,
  validateRemoveFriend,
  handleValidationErrors,
  friendController.removeFriend
);

// Tìm kiếm người dùng
router.get(
  '/search',
  verifyToken,
  validateSearchUsers,
  handleValidationErrors,
  friendController.searchUsers
);

export default router;
