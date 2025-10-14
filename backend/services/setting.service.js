import db from '../models/index.js';
import { Op } from 'sequelize';
import { redisHelpers } from '../config/redis.js';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { User, LoginHistory, Friendship, Favorite, WatchHistory, Comment, Notification } = db;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @desc Lấy cài đặt quyền riêng tư của người dùng
 * @param {number} userId - ID của người dùng
 * @returns {Promise<Object>} Cài đặt quyền riêng tư
 */
const getPrivacySettings = async (userId) => {
  try {
    // Try cache first
    const cacheKey = `user:${userId}:privacy_settings`;
    const cached = await redisHelpers.safeGet(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await User.findByPk(userId, {
      attributes: [
        'profileVisibility',
        'canReceiveFriendRequests',
        'showOnlineStatus',
        'showFriendList',
        'showFavorites',
        'showWatchHistory',
        'allowSearchEngineIndexing',
      ],
    });

    if (!user) {
      throw new Error('Người dùng không tồn tại.');
    }

    const settings = user.get({ plain: true });

    // Cache for 10 minutes
    await redisHelpers.safeSet(cacheKey, settings, 600);

    return settings;
  } catch (error) {
    console.error('Error in getPrivacySettings:', error);
    throw error;
  }
};

/**
 * @desc Cập nhật cài đặt quyền riêng tư
 * @param {number} userId - ID của người dùng
 * @param {Object} settings - Cài đặt mới
 * @returns {Promise<Object>} Cài đặt đã cập nhật
 */
const updatePrivacySettings = async (userId, settings) => {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Người dùng không tồn tại.');
    }

    // Validate and update only allowed fields
    const allowedFields = [
      'profileVisibility',
      'canReceiveFriendRequests',
      'showOnlineStatus',
      'showFriendList',
      'showFavorites',
      'showWatchHistory',
      'allowSearchEngineIndexing',
    ];

    allowedFields.forEach((field) => {
      if (settings[field] !== undefined) {
        user[field] = settings[field];
      }
    });

    await user.save();

    // Invalidate cache
    await redisHelpers.safeDel(`user:${userId}:privacy_settings`);
    await redisHelpers.safeDel(`user:${userId}:friends`);

    return {
      profileVisibility: user.profileVisibility,
      canReceiveFriendRequests: user.canReceiveFriendRequests,
      showOnlineStatus: user.showOnlineStatus,
      showFriendList: user.showFriendList,
      showFavorites: user.showFavorites,
      showWatchHistory: user.showWatchHistory,
      allowSearchEngineIndexing: user.allowSearchEngineIndexing,
    };
  } catch (error) {
    console.error('Error in updatePrivacySettings:', error);
    throw error;
  }
};

/**
 * @desc Lấy cài đặt thông báo của người dùng
 * @param {number} userId - ID của người dùng
 * @returns {Promise<Object>} Cài đặt thông báo
 */
const getNotificationSettings = async (userId) => {
  try {
    // Try cache first
    const cacheKey = `user:${userId}:notification_settings`;
    const cached = await redisHelpers.safeGet(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await User.findByPk(userId, {
      attributes: ['notificationSettings'],
    });

    if (!user) {
      throw new Error('Người dùng không tồn tại.');
    }

    const settings = user.notificationSettings;

    // Cache for 10 minutes
    await redisHelpers.safeSet(cacheKey, settings, 600);

    return settings;
  } catch (error) {
    console.error('Error in getNotificationSettings:', error);
    throw error;
  }
};

/**
 * @desc Cập nhật cài đặt thông báo
 * @param {number} userId - ID của người dùng
 * @param {Object} settings - Cài đặt thông báo mới
 * @returns {Promise<Object>} Cài đặt đã cập nhật
 */
const updateNotificationSettings = async (userId, settings) => {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Người dùng không tồn tại.');
    }

    // Merge with existing settings
    const currentSettings = user.notificationSettings || {};
    const updatedSettings = { ...currentSettings, ...settings };

    user.notificationSettings = updatedSettings;
    await user.save();

    // Invalidate cache
    await redisHelpers.safeDel(`user:${userId}:notification_settings`);

    return user.notificationSettings;
  } catch (error) {
    console.error('Error in updateNotificationSettings:', error);
    throw error;
  }
};

/**
 * @desc Lấy thông tin tài khoản (tổng quan)
 * @param {number} userId - ID của người dùng
 * @returns {Promise<Object>} Thông tin tài khoản
 */
const getAccountInfo = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'uuid', 'username', 'email', 'createdAt'],
    });

    if (!user) {
      throw new Error('Người dùng không tồn tại.');
    }

    // Count various data
    const [friendsCount, favoritesCount, watchHistoryCount, commentsCount] = await Promise.all([
      Friendship.count({
        where: {
          [Op.or]: [{ senderId: userId }, { receiverId: userId }],
          status: 'accepted',
        },
      }),
      Favorite.count({ where: { userId } }),
      WatchHistory.count({ where: { userId } }),
      Comment.count({ where: { userId } }),
    ]);

    return {
      user: user.get({ plain: true }),
      stats: {
        friendsCount,
        favoritesCount,
        watchHistoryCount,
        commentsCount,
      },
    };
  } catch (error) {
    console.error('Error in getAccountInfo:', error);
    throw error;
  }
};

/**
 * @desc Tạo file zip chứa dữ liệu người dùng để tải xuống
 * @param {number} userId - ID của người dùng
 * @returns {Promise<string>} Đường dẫn đến file zip
 */
const generateUserDataExport = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      throw new Error('Người dùng không tồn tại.');
    }

    // Fetch all user data
    const [friendships, favorites, watchHistory, comments, notifications, loginHistory] = await Promise.all([
      Friendship.findAll({
        where: {
          [Op.or]: [{ senderId: userId }, { receiverId: userId }],
        },
        include: [
          { model: User, as: 'sender', attributes: ['username', 'email'] },
          { model: User, as: 'receiver', attributes: ['username', 'email'] },
        ],
      }),
      Favorite.findAll({
        where: { userId },
        include: [{ model: db.Movie, as: 'movie', attributes: ['titles', 'slug'] }],
      }),
      WatchHistory.findAll({
        where: { userId },
        include: [{ model: db.Movie, as: 'movie', attributes: ['titles', 'slug'] }],
      }),
      Comment.findAll({
        where: { userId },
        attributes: { exclude: ['userId'] },
      }),
      Notification.findAll({
        where: { userId },
        attributes: { exclude: ['userId'] },
      }),
      LoginHistory.findAll({
        where: { userId },
        attributes: { exclude: ['userId'] },
      }),
    ]);

    // Create export directory if not exists
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = Date.now();
    const zipFileName = `user_data_${userId}_${timestamp}.zip`;
    const zipFilePath = path.join(exportDir, zipFileName);

    // Create write stream
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        resolve(zipFilePath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add user data as JSON files
      archive.append(JSON.stringify(user.get({ plain: true }), null, 2), { name: 'profile.json' });
      archive.append(JSON.stringify(friendships.map(f => f.get({ plain: true })), null, 2), { name: 'friendships.json' });
      archive.append(JSON.stringify(favorites.map(f => f.get({ plain: true })), null, 2), { name: 'favorites.json' });
      archive.append(JSON.stringify(watchHistory.map(w => w.get({ plain: true })), null, 2), { name: 'watch_history.json' });
      archive.append(JSON.stringify(comments.map(c => c.get({ plain: true })), null, 2), { name: 'comments.json' });
      archive.append(JSON.stringify(notifications.map(n => n.get({ plain: true })), null, 2), { name: 'notifications.json' });
      archive.append(JSON.stringify(loginHistory.map(l => l.get({ plain: true })), null, 2), { name: 'login_history.json' });

      archive.finalize();
    });
  } catch (error) {
    console.error('Error in generateUserDataExport:', error);
    throw error;
  }
};

/**
 * @desc Xóa tài khoản người dùng vĩnh viễn
 * @param {number} userId - ID của người dùng
 * @param {string} password - Mật khẩu xác nhận
 * @returns {Promise<void>}
 */
const deleteUserAccount = async (userId, password) => {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Người dùng không tồn tại.');
    }

    // Verify password
    const bcrypt = await import('bcrypt');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Mật khẩu không chính xác.');
    }

    // Use transaction to ensure data integrity
    await db.sequelize.transaction(async (t) => {
      // Delete related data (cascade will handle most, but we do it explicitly for clarity)
      await Promise.all([
        Friendship.destroy({ where: { [Op.or]: [{ senderId: userId }, { receiverId: userId }] }, transaction: t }),
        Favorite.destroy({ where: { userId }, transaction: t }),
        WatchHistory.destroy({ where: { userId }, transaction: t }),
        Comment.destroy({ where: { userId }, transaction: t }),
        Notification.destroy({ where: { [Op.or]: [{ userId }, { senderId: userId }] }, transaction: t }),
        LoginHistory.destroy({ where: { userId }, transaction: t }),
      ]);

      // Finally, delete the user (soft delete if paranoid is true)
      await user.destroy({ transaction: t, force: true }); // force: true for hard delete
    });

    // Invalidate all caches related to this user
    await redisHelpers.safeDel(`user:${userId}:privacy_settings`);
    await redisHelpers.safeDel(`user:${userId}:notification_settings`);
    await redisHelpers.safeDel(`user:${userId}:friends`);
    await redisHelpers.invalidatePattern(`search:users:*`);
  } catch (error) {
    console.error('Error in deleteUserAccount:', error);
    throw error;
  }
};

/**
 * @desc Lấy lịch sử đăng nhập của người dùng
 * @param {number} userId - ID của người dùng
 * @param {number} page - Trang hiện tại
 * @param {number} limit - Số lượng item mỗi trang
 * @returns {Promise<Object>} Lịch sử đăng nhập với phân trang
 */
const getLoginHistory = async (userId, page = 1, limit = 10) => {
  try {
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (validPage - 1) * validLimit;

    const { count, rows: loginHistory } = await LoginHistory.findAndCountAll({
      where: { userId },
      attributes: ['id', 'provider', 'ipAddress', 'userAgent', 'deviceType', 'loginAt', 'logoutAt'],
      limit: validLimit,
      offset,
      order: [['loginAt', 'DESC']],
    });

    const totalPages = Math.ceil(count / validLimit);

    return {
      data: loginHistory,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalItems: count,
        itemsPerPage: validLimit,
        hasMore: validPage < totalPages,
      },
    };
  } catch (error) {
    console.error('Error in getLoginHistory:', error);
    throw error;
  }
};

export {
  getPrivacySettings,
  updatePrivacySettings,
  getNotificationSettings,
  updateNotificationSettings,
  getAccountInfo,
  generateUserDataExport,
  deleteUserAccount,
  getLoginHistory,
};
