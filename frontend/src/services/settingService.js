import api from './api';

/**
 * Get privacy settings
 */
export const getPrivacySettings = async () => {
  const response = await api.get('/settings/privacy');
  return response.data;
};

/**
 * Update privacy settings
 */
export const updatePrivacySettings = async (settings) => {
  const response = await api.put('/settings/privacy', settings);
  return response.data;
};

/**
 * Get notification settings
 */
export const getNotificationSettings = async () => {
  const response = await api.get('/settings/notifications');
  return response.data;
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (settings) => {
  const response = await api.put('/settings/notifications', settings);
  return response.data;
};

/**
 * Get account info
 */
export const getAccountInfo = async () => {
  const response = await api.get('/settings/info');
  return response.data;
};

/**
 * Download user data
 */
export const downloadUserData = async () => {
  const response = await api.post('/settings/download-data', {}, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Delete account
 */
export const deleteAccount = async (password) => {
  const response = await api.delete('/settings/delete', {
    data: { password },
  });
  return response.data;
};

/**
 * Get login history
 */
export const getLoginHistory = async (page = 1, limit = 10) => {
  const response = await api.get('/settings/login-history', {
    params: { page, limit },
  });
  return response.data;
};
