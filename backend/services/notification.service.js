import db from '../models/index.js';
import { getIo } from '../config/socket.js';
import { Op } from 'sequelize';

const { Notification, User } = db;

/**
 * Map notification type to settings key
 */
const getNotificationSettingKey = (type) => {
  const typeMap = {
    'friend_request': 'friendRequest',
    'friend_request_status': 'friendRequestStatus',
    'new_message': 'newMessage',
    'new_comment': 'movieActivity',
    'like_comment': 'movieActivity',
    'user_mention': 'movieActivity',
    'movie_update': 'movieActivity',
  };
  return typeMap[type] || null;
};

/**
 * @desc Tạo thông báo mới và emit qua Socket.IO cho người nhận.
 * @param {object} notificationData - Dữ liệu thông báo.
 * @param {number} notificationData.userId - ID của người nhận.
 * @param {string} notificationData.type - Loại thông báo.
 * @param {string} notificationData.title - Tiêu đề thông báo.
 * @param {string} notificationData.body - Nội dung chi tiết thông báo.
 * @param {number} [notificationData.senderId=null] - ID của người gửi.
 * @param {string} [notificationData.link=null] - Link điều hướng.
 * @param {object} [notificationData.metadata={}] - Dữ liệu bổ sung.
 * @returns {Promise<object>} - Đối tượng thông báo đã tạo kèm thông tin người gửi.
 */
export const createNotification = async (notificationData) => {
  const { userId, type, title, body, senderId = null, link = null, metadata = {} } = notificationData;

  try {
    // Kiểm tra xem người nhận có tồn tại không và lấy notification settings
    const receiver = await User.findByPk(userId, {
      attributes: ['id', 'notificationSettings']
    });
    if (!receiver) {
      // Không ném lỗi để tránh làm sập các tiến trình khác, chỉ ghi log
      console.error(`NotificationService: Người nhận với ID ${userId} không tồn tại.`);
      return null;
    }

    // Kiểm tra xem người dùng có bật thông báo cho loại này không
    const settingKey = getNotificationSettingKey(type);
    if (settingKey) {
      const userSettings = receiver.notificationSettings || {};
      const notifSetting = userSettings[settingKey];
      
      // Chỉ kiểm tra in-app notification (hiện tại chỉ hỗ trợ in-app)
      if (!notifSetting || !notifSetting.inApp) {
        console.log(`NotificationService: User ${userId} đã tắt thông báo ${type}.`);
        return null; // Không tạo thông báo nếu user đã tắt
      }
    }

    // Tạo thông báo trong CSDL
    const notification = await Notification.create({
      userId,
      senderId,
      type,
      title,
      body,
      link,
      metadata,
    });

    // Lấy thông báo vừa tạo kèm thông tin người gửi (nếu có)
    const fullNotification = await Notification.findByPk(notification.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'uuid', 'username', 'avatarUrl'],
      }],
    });

    // Gửi sự kiện qua socket
    const io = getIo();
    const userRoom = `user_${userId}`;

    // 1. Gửi thông báo mới
    io.to(userRoom).emit('notification:new', fullNotification);

    // 2. Cập nhật số lượng chưa đọc
    const unreadCount = await getUnreadNotificationsCount(userId);
    io.to(userRoom).emit('notification:unread-count', { unread: unreadCount });

    return fullNotification;
  } catch (error) {
    console.error('NotificationService: Lỗi khi tạo thông báo:', error);
    throw error;
  }
};

/**
 * @desc Lấy danh sách thông báo của người dùng với phân trang và lọc.
 * @param {number} userId - ID của người dùng.
 * @param {object} options - Tùy chọn truy vấn.
 * @param {number} [options.page=1] - Trang hiện tại.
 * @param {number} [options.limit=10] - Số lượng mỗi trang.
 * @param {boolean} [options.isRead=null] - Lọc theo trạng thái đã đọc.
 * @param {string} [options.tab='all'] - Tab lọc: 'all', 'unread', 'system'.
 * @returns {Promise<object>} - Đối tượng chứa danh sách thông báo và metadata phân trang.
 */
export const getNotificationsForUser = async (userId, options = {}) => {
  const { page = 1, limit = 10, isRead, tab = 'all' } = options;
  const offset = (page - 1) * limit;

  const whereCondition = { userId };

  // Áp dụng bộ lọc từ query params
  if (isRead !== undefined) {
    whereCondition.isRead = isRead;
  }

  // Áp dụng bộ lọc theo tab
  if (tab === 'unread') {
    whereCondition.isRead = false;
  } else if (tab === 'system') {
    whereCondition.type = 'system_message';
  }

  try {
    const { count, rows } = await Notification.findAndCountAll({
      where: whereCondition,
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'uuid', 'username', 'avatarUrl'],
      }],
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return {
      data: rows,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        hasMore: offset + rows.length < count,
      },
    };
  } catch (error) {
    console.error('NotificationService: Lỗi khi lấy danh sách thông báo:', error);
    throw error;
  }
};

/**
 * @desc Lấy chi tiết một thông báo.
 * @param {number} notificationId - ID thông báo.
 * @param {number} userId - ID người dùng.
 * @returns {Promise<object|null>}
 */
export const getNotificationById = async (notificationId, userId) => {
  try {
    return await Notification.findOne({
      where: { id: notificationId, userId },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'uuid', 'username', 'avatarUrl'],
      }],
    });
  } catch (error) {
    console.error('NotificationService: Lỗi khi lấy chi tiết thông báo:', error);
    throw error;
  }
};

/**
 * @desc Đánh dấu một thông báo là đã đọc.
 * @param {number} notificationId - ID thông báo.
 * @param {number} userId - ID người dùng.
 * @returns {Promise<boolean>} - True nếu cập nhật thành công.
 */
export const markAsRead = async (notificationId, userId) => {
  try {
    const [affectedCount] = await Notification.update(
      { isRead: true },
      { where: { id: notificationId, userId, isRead: false } }
    );

    if (affectedCount > 0) {
      const io = getIo();
      const userRoom = `user_${userId}`;
      // Gửi sự kiện cập nhật trạng thái
      io.to(userRoom).emit('notification:update', { id: notificationId, patch: { isRead: true } });
      // Gửi số lượng chưa đọc mới
      const unreadCount = await getUnreadNotificationsCount(userId);
      io.to(userRoom).emit('notification:unread-count', { unread: unreadCount });
      return true;
    }
    return false;
  } catch (error) {
    console.error('NotificationService: Lỗi khi đánh dấu đã đọc:', error);
    throw error;
  }
};

/**
 * @desc Đánh dấu nhiều thông báo là đã đọc.
 * @param {number[]} ids - Mảng các ID thông báo.
 * @param {number} userId - ID người dùng.
 * @returns {Promise<number>} - Số lượng thông báo được cập nhật.
 */
export const markMultipleAsRead = async (ids, userId) => {
  if (!ids || ids.length === 0) return 0;

  try {
    const [affectedCount] = await Notification.update(
      { isRead: true },
      { where: { id: { [Op.in]: ids }, userId, isRead: false } }
    );

    if (affectedCount > 0) {
      const io = getIo();
      const userRoom = `user_${userId}`;
      // Gửi sự kiện cập nhật cho từng ID
      ids.forEach(id => {
        io.to(userRoom).emit('notification:update', { id, patch: { isRead: true } });
      });
      // Gửi số lượng chưa đọc mới
      const unreadCount = await getUnreadNotificationsCount(userId);
      io.to(userRoom).emit('notification:unread-count', { unread: unreadCount });
    }
    return affectedCount;
  } catch (error) {
    console.error('NotificationService: Lỗi khi đánh dấu nhiều thông báo đã đọc:', error);
    throw error;
  }
};

/**
 * @desc Đánh dấu tất cả thông báo chưa đọc của người dùng là đã đọc.
 * @param {number} userId - ID của người dùng.
 * @returns {Promise<number>} - Số lượng thông báo được cập nhật.
 */
export const markAllAsRead = async (userId) => {
  try {
    const [affectedCount] = await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false }, returning: false } // returning: false để tối ưu
    );

    if (affectedCount > 0) {
      const io = getIo();
      const userRoom = `user_${userId}`;
      // Thông báo cho client rằng tất cả đã được đọc (client tự xử lý)
      io.to(userRoom).emit('notification:all-read');
      // Gửi số lượng chưa đọc mới
      io.to(userRoom).emit('notification:unread-count', { unread: 0 });
    }
    return affectedCount;
  } catch (error) {
    console.error('NotificationService: Lỗi khi đánh dấu tất cả đã đọc:', error);
    throw error;
  }
};

/**
 * @desc Xóa một thông báo.
 * @param {number} notificationId - ID thông báo.
 * @param {number} userId - ID người dùng.
 * @returns {Promise<boolean>} - True nếu xóa thành công.
 */
export const deleteNotification = async (notificationId, userId) => {
  try {
    const deletedCount = await Notification.destroy({
      where: { id: notificationId, userId },
    });

    if (deletedCount > 0) {
      const io = getIo();
      const userRoom = `user_${userId}`;
      // Gửi sự kiện xóa
      io.to(userRoom).emit('notification:delete', { id: notificationId });
      // Cập nhật số lượng chưa đọc
      const unreadCount = await getUnreadNotificationsCount(userId);
      io.to(userRoom).emit('notification:unread-count', { unread: unreadCount });
      return true;
    }
    return false;
  } catch (error) {
    console.error('NotificationService: Lỗi khi xóa thông báo:', error);
    throw error;
  }
};

/**
 * @desc Xóa tất cả thông báo của một người dùng.
 * @param {number} userId - ID của người dùng.
 * @returns {Promise<number>} - Số lượng thông báo đã xóa.
 */
export const clearAllNotifications = async (userId) => {
  try {
    const deletedCount = await Notification.destroy({
      where: { userId },
    });

    if (deletedCount > 0) {
      const io = getIo();
      const userRoom = `user_${userId}`;
      // Thông báo cho client rằng tất cả đã bị xóa
      io.to(userRoom).emit('notification:all-cleared');
      // Cập nhật số lượng chưa đọc
      io.to(userRoom).emit('notification:unread-count', { unread: 0 });
    }
    return deletedCount;
  } catch (error) {
    console.error('NotificationService: Lỗi khi xóa tất cả thông báo:', error);
    throw error;
  }
};

/**
 * @desc Lấy số lượng thông báo chưa đọc của người dùng.
 * @param {number} userId - ID của người dùng.
 * @returns {Promise<number>} - Số lượng thông báo chưa đọc.
 */
export const getUnreadNotificationsCount = async (userId) => {
  try {
    return await Notification.count({
      where: { userId, isRead: false },
    });
  } catch (error) {
    console.error('NotificationService: Lỗi khi đếm thông báo chưa đọc:', error);
    throw error;
  }
};

/**
 * @desc Tạo thông báo cho nhiều người dùng (admin/system).
 * @param {object} bulkData - Dữ liệu thông báo hàng loạt.
 * @returns {Promise<object>} - Kết quả tạo hàng loạt.
 */
export const createBulkNotifications = async (bulkData) => {
  const { userIds, type, title, body, senderId = null, link = null, metadata = {} } = bulkData;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new Error("Danh sách 'userIds' là bắt buộc và không được rỗng.");
  }

  try {
    // Lấy notification settings của tất cả users
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'notificationSettings']
    });

    // Lọc ra những user đã bật thông báo cho loại này
    const settingKey = getNotificationSettingKey(type);
    const filteredUserIds = users.filter(user => {
      if (!settingKey) return true; // Nếu không map được, cho phép tạo (system message, etc.)
      
      const userSettings = user.notificationSettings || {};
      const notifSetting = userSettings[settingKey];
      
      // Chỉ tạo nếu user đã bật in-app notification
      return notifSetting && notifSetting.inApp;
    }).map(user => user.id);

    if (filteredUserIds.length === 0) {
      console.log(`NotificationService: Không có user nào bật thông báo ${type}.`);
      return { success: true, created: 0 };
    }

    const notificationPayloads = filteredUserIds.map(userId => ({
      userId,
      senderId,
      type,
      title,
      body,
      link,
      metadata,
    }));

    // Sử dụng bulkCreate để tối ưu hiệu năng
    const createdNotifications = await Notification.bulkCreate(notificationPayloads);

    // Gửi socket cho từng người dùng sau khi đã tạo thành công
    const io = getIo();
    for (const notification of createdNotifications) {
      const userRoom = `user_${notification.userId}`;
      // Lấy thông tin đầy đủ để gửi đi
      const fullNotification = await Notification.findByPk(notification.id, {
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'uuid', 'username', 'avatarUrl'],
        }],
      });
      io.to(userRoom).emit('notification:new', fullNotification);
      const unreadCount = await getUnreadNotificationsCount(notification.userId);
      io.to(userRoom).emit('notification:unread-count', { unread: unreadCount });
    }

    return {
      success: true,
      count: createdNotifications.length,
    };
  } catch (error) {
    console.error('NotificationService: Lỗi khi tạo thông báo hàng loạt:', error);
    throw error;
  }
};
