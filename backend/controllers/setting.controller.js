import asyncHandler from 'express-async-handler';
import * as settingService from '../services/setting.service.js';
import path from 'path';
import fs from 'fs';

// @desc    Lấy cài đặt quyền riêng tư
// @route   GET /api/settings/privacy
// @access  Private
const getPrivacySettings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const settings = await settingService.getPrivacySettings(userId);
  res.status(200).json({
    data: settings,
    message: 'Lấy cài đặt quyền riêng tư thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Cập nhật cài đặt quyền riêng tư
// @route   PUT /api/settings/privacy
// @access  Private
const updatePrivacySettings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const settings = req.body;
  
  // Validate input
  const validVisibilityValues = ['public', 'friends', 'private'];
  const validFriendRequestValues = ['everyone', 'friends_of_friends', 'nobody'];
  
  if (settings.profileVisibility && !validVisibilityValues.includes(settings.profileVisibility)) {
    res.status(400);
    throw new Error('Giá trị profileVisibility không hợp lệ.');
  }
  
  if (settings.canReceiveFriendRequests && !validFriendRequestValues.includes(settings.canReceiveFriendRequests)) {
    res.status(400);
    throw new Error('Giá trị canReceiveFriendRequests không hợp lệ.');
  }
  
  if (settings.showFriendList && !validVisibilityValues.includes(settings.showFriendList)) {
    res.status(400);
    throw new Error('Giá trị showFriendList không hợp lệ.');
  }
  
  if (settings.showFavorites && !validVisibilityValues.includes(settings.showFavorites)) {
    res.status(400);
    throw new Error('Giá trị showFavorites không hợp lệ.');
  }
  
  if (settings.showWatchHistory && !validVisibilityValues.includes(settings.showWatchHistory)) {
    res.status(400);
    throw new Error('Giá trị showWatchHistory không hợp lệ.');
  }
  
  const updatedSettings = await settingService.updatePrivacySettings(userId, settings);
  res.status(200).json({
    data: updatedSettings,
    message: 'Cập nhật cài đặt quyền riêng tư thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Lấy cài đặt thông báo
// @route   GET /api/settings/notifications
// @access  Private
const getNotificationSettings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const settings = await settingService.getNotificationSettings(userId);
  res.status(200).json({
    data: settings,
    message: 'Lấy cài đặt thông báo thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Cập nhật cài đặt thông báo
// @route   PUT /api/settings/notifications
// @access  Private
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const settings = req.body;
  
  // Validate structure
  const validKeys = ['friendRequest', 'friendRequestStatus', 'newMessage', 'movieActivity'];
  const validChannels = ['inApp', 'email', 'sms'];
  
  for (const key in settings) {
    if (!validKeys.includes(key)) {
      res.status(400);
      throw new Error(`Khóa cài đặt không hợp lệ: ${key}`);
    }
    
    for (const channel in settings[key]) {
      if (!validChannels.includes(channel)) {
        res.status(400);
        throw new Error(`Kênh thông báo không hợp lệ: ${channel}`);
      }
      
      if (typeof settings[key][channel] !== 'boolean') {
        res.status(400);
        throw new Error(`Giá trị phải là boolean cho ${key}.${channel}`);
      }
    }
  }
  
  const updatedSettings = await settingService.updateNotificationSettings(userId, settings);
  res.status(200).json({
    data: updatedSettings,
    message: 'Cập nhật cài đặt thông báo thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Lấy thông tin tài khoản
// @route   GET /api/account/info
// @access  Private
const getAccountInfo = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const accountInfo = await settingService.getAccountInfo(userId);
  res.status(200).json({
    data: accountInfo,
    message: 'Lấy thông tin tài khoản thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Yêu cầu tải xuống dữ liệu
// @route   POST /api/account/download-data
// @access  Private
const downloadUserData = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  try {
    const zipFilePath = await settingService.generateUserDataExport(userId);
    
    // Send file
    res.download(zipFilePath, path.basename(zipFilePath), (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            data: null,
            message: 'Lỗi khi tải xuống file.',
            errors: [err.message],
            meta: null,
          });
        }
      }
      
      // Delete file after download
      fs.unlink(zipFilePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting export file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error('Error in downloadUserData:', error);
    res.status(500).json({
      data: null,
      message: 'Lỗi khi tạo file dữ liệu.',
      errors: [error.message],
      meta: null,
    });
  }
});

// @desc    Xóa tài khoản
// @route   DELETE /api/account/delete
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;
  
  if (!password) {
    res.status(400);
    throw new Error('Vui lòng nhập mật khẩu để xác nhận.');
  }
  
  await settingService.deleteUserAccount(userId, password);
  
  res.status(200).json({
    data: null,
    message: 'Tài khoản đã được xóa thành công.',
    errors: null,
    meta: null,
  });
});

// @desc    Lấy lịch sử đăng nhập
// @route   GET /api/account/login-history
// @access  Private
const getLoginHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  
  const result = await settingService.getLoginHistory(userId, parseInt(page), parseInt(limit));
  
  res.status(200).json({
    data: result.data,
    message: 'Lấy lịch sử đăng nhập thành công.',
    errors: null,
    meta: {
      pagination: result.pagination,
    },
  });
});

export {
  getPrivacySettings,
  updatePrivacySettings,
  getNotificationSettings,
  updateNotificationSettings,
  getAccountInfo,
  downloadUserData,
  deleteAccount,
  getLoginHistory,
};
