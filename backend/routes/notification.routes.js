import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  getNotificationDetails,
  markOneAsRead,
  markManyAsRead,
  markAllAsRead,
  deleteOne,
  deleteAll,
  createAdminNotification,
  createAdminBulkNotification,
} from '../controllers/notification.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Tất cả các route dưới đây đều yêu cầu xác thực token
router.use(verifyToken);

// === Routes cho người dùng ===
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/:id', getNotificationDetails);

// Sử dụng POST cho các hành động thay đổi trạng thái theo chuẩn RESTful hơn
router.post('/:id/read', markOneAsRead);
router.post('/mark-read', markManyAsRead);
router.post('/mark-all-read', markAllAsRead);

router.delete('/:id', deleteOne);
router.delete('/clear-all', deleteAll);


// === Routes cho Admin & Editor ===
// Middleware kiểm tra vai trò 'admin' hoặc 'editor'
const requireAdminOrEditor = authorizeRoles('admin', 'editor');

// Tạo thông báo cho một người dùng cụ thể
router.post('/', requireAdminOrEditor, createAdminNotification);

// Tạo thông báo hàng loạt
router.post('/bulk', requireAdminOrEditor, createAdminBulkNotification);

export default router;
