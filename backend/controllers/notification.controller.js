import * as NotificationService from '../services/notification.service.js';
import { authorizeRoles } from '../middlewares/auth.middleware.js';

/**
 * @desc Lấy danh sách thông báo của người dùng (có phân trang và lọc).
 * @route GET /api/notifications
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit, isRead, tab } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      tab,
    };
    if (isRead !== undefined) {
      options.isRead = isRead === 'true';
    }

    const result = await NotificationService.getNotificationsForUser(userId, options);

    res.status(200).json({
      success: true,
      ...result, // Spread the result which contains { data, meta }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Lấy số lượng thông báo chưa đọc.
 * @route GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = await NotificationService.getUnreadNotificationsCount(userId);
    res.status(200).json({
      success: true,
      data: { unread: count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Lấy chi tiết một thông báo.
 * @route GET /api/notifications/:id
 */
export const getNotificationDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await NotificationService.getNotificationById(parseInt(id), userId);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Thông báo không tồn tại.' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Đánh dấu một thông báo là đã đọc.
 * @route POST /api/notifications/:id/read
 */
export const markOneAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const success = await NotificationService.markAsRead(parseInt(id), userId);

    if (!success) {
      // Có thể thông báo không tồn tại hoặc đã được đọc
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo hoặc thông báo đã được đọc.' });
    }

    res.status(200).json({ success: true, message: 'Đã đánh dấu thông báo là đã đọc.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Đánh dấu nhiều thông báo là đã đọc.
 * @route POST /api/notifications/mark-read
 */
export const markManyAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp một mảng các ID thông báo.' });
    }

    const affectedCount = await NotificationService.markMultipleAsRead(ids, userId);
    res.status(200).json({
      success: true,
      message: `Đã đánh dấu ${affectedCount} thông báo là đã đọc.`,
      data: { affectedCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Đánh dấu tất cả thông báo là đã đọc.
 * @route POST /api/notifications/mark-all-read
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const affectedCount = await NotificationService.markAllAsRead(userId);
    res.status(200).json({
      success: true,
      message: `Đã đánh dấu ${affectedCount} thông báo là đã đọc.`,
      data: { affectedCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Xóa một thông báo.
 * @route DELETE /api/notifications/:id
 */
export const deleteOne = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const success = await NotificationService.deleteNotification(parseInt(id), userId);

    if (!success) {
      return res.status(404).json({ success: false, message: 'Thông báo không tồn tại.' });
    }

    res.status(200).json({ success: true, message: 'Đã xóa thông báo thành công.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Xóa tất cả thông báo của người dùng.
 * @route DELETE /api/notifications/clear-all
 */
export const deleteAll = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deletedCount = await NotificationService.clearAllNotifications(userId);
    res.status(200).json({
      success: true,
      message: `Đã xóa ${deletedCount} thông báo.`,
      data: { deletedCount },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ADMIN ROUTES ====================

/**
 * @desc [Admin] Tạo một thông báo mới cho người dùng.
 * @route POST /api/notifications
 */
export const createAdminNotification = async (req, res, next) => {
  try {
    const { userId, type, title, body, link, metadata } = req.body;
    const senderId = req.user.id; // Admin/Editor gửi

    const notification = await NotificationService.createNotification({
      userId,
      type,
      title,
      body,
      senderId,
      link,
      metadata,
    });

    if (!notification) {
      return res.status(400).json({ success: false, message: 'Không thể tạo thông báo, người nhận không hợp lệ.' });
    }

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc [Admin] Tạo thông báo hàng loạt cho nhiều người dùng.
 * @route POST /api/notifications/bulk
 */
export const createAdminBulkNotification = async (req, res, next) => {
  try {
    const { userIds, type, title, body, link, metadata } = req.body;
    const senderId = req.user.id;

    const result = await NotificationService.createBulkNotifications({
      userIds,
      type,
      title,
      body,
      senderId,
      link,
      metadata,
    });

    res.status(201).json({
      success: true,
      message: `Đã tạo thành công ${result.count} thông báo.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
