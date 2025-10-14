import express from 'express';
import {
  findOrCreatePrivateConversation,
  createGroupConversation,
  getConversations,
  getConversationById,
  sendMessage,
  getMessages,
  markMessagesAsSeen,
  searchMessages,
  pinConversation,
  lockConversation,
  hideConversation,
  blockUser,
  deleteMessage,
} from '../controllers/message.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ==================== Conversation Routes ====================

// Tìm hoặc tạo hội thoại 1-1
router.post('/conversations/private', verifyToken, findOrCreatePrivateConversation);

// Tạo hội thoại nhóm
router.post('/conversations/group', verifyToken, createGroupConversation);

// Lấy danh sách hội thoại
router.get('/conversations', verifyToken, getConversations);

// Lấy chi tiết hội thoại
router.get('/conversations/:conversationId', verifyToken, getConversationById);

// Ghim hội thoại
router.post('/conversations/:conversationId/pin', verifyToken, pinConversation);

// Khóa hội thoại
router.post('/conversations/:conversationId/lock', verifyToken, lockConversation);

// Ẩn hội thoại
router.post('/conversations/:conversationId/hide', verifyToken, hideConversation);

// Chặn người dùng trong hội thoại
router.post('/conversations/:conversationId/block', verifyToken, blockUser);

// ==================== Message Routes ====================

// Gửi tin nhắn
router.post('/conversations/:conversationId/messages', verifyToken, sendMessage);

// Lấy tin nhắn trong hội thoại
router.get('/conversations/:conversationId/messages', verifyToken, getMessages);

// Đánh dấu đã xem
router.post('/conversations/:conversationId/seen', verifyToken, markMessagesAsSeen);

// Tìm kiếm tin nhắn
router.get('/conversations/:conversationId/search', verifyToken, searchMessages);

// Xóa tin nhắn
router.delete('/messages/:messageId', verifyToken, deleteMessage);

export default router;