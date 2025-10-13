import api from './api.js';

/**
 * Lấy danh sách thông báo của người dùng
 * @param {Object} params - Tham số truy vấn
 * @param {number} params.page - Trang hiện tại (bắt đầu từ 1)
 * @param {number} params.limit - Số lượng thông báo mỗi trang
 * @param {string} params.tab - Tab lọc ('all', 'unread', 'system').
 * @returns {Promise<Object>} - Đối tượng chứa danh sách thông báo và metadata phân trang.
 */
export const fetchNotifications = async (params = {}) => {
  try {
    // BE đã hỗ trợ lọc theo tab, chỉ cần truyền thẳng params
    const response = await api.get('/notifications', { params });
    // API trả về { success: true, data: [], meta: {} }
    // Cần trả về object chứa data và meta để React Query xử lý
    return { data: response.data.data, meta: response.data.meta };
  } catch (error) {
    console.error('Lỗi khi lấy thông báo:', error);
    throw error;
  }
};

/**
 * Lấy số lượng thông báo chưa đọc
 * @returns {Promise<number>} - Số lượng thông báo chưa đọc
 */
export const fetchUnreadCount = async () => {
  try {
    const response = await api.get('/notifications/unread-count');
    // API trả về { success: true, data: { unread: 5 } }
    return response.data.data?.unread ?? 0;
  } catch (error) {
    console.error('Lỗi khi lấy số lượng thông báo chưa đọc:', error);
    throw error;
  }
};

/**
 * Lấy thông báo theo ID
 * @param {number} notificationId - ID của thông báo
 * @returns {Promise<Object>} - Thông báo
 */
export const getNotificationById = async (notificationId) => {
  try {
    const response = await api.get(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy thông báo:', error);
    throw error;
  }
};

/**
 * Đánh dấu một thông báo đã đọc
 * @param {number} notificationId - ID của thông báo
 * @returns {Promise<Object>} - Kết quả từ server
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    // Endpoint mới: POST /api/notifications/:id/read
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi đánh dấu thông báo đã đọc:', error);
    throw error;
  }
};

/**
 * Đánh dấu tất cả thông báo đã đọc
 * @returns {Promise<Object>} - Kết quả cập nhật
 */
export const markAllNotificationsAsRead = async () => {
  try {
    // Endpoint mới: POST /api/notifications/mark-all-read
    const response = await api.post('/notifications/mark-all-read');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi đánh dấu tất cả thông báo đã đọc:', error);
    throw error;
  }
};

/**
 * Xóa một thông báo
 * @param {number} notificationId - ID của thông báo
 * @returns {Promise<Object>} - Kết quả xóa
 */
export const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi xóa thông báo:', error);
    throw error;
  }
};

/**
 * Xóa tất cả thông báo
 * @returns {Promise<Object>} - Kết quả xóa
 */
export const clearAllNotifications = async () => {
  try {
    const response = await api.delete('/notifications/clear-all');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi xóa tất cả thông báo:', error);
    throw error;
  }
};

/**
 * Tạo thông báo mới (chỉ dành cho admin/editor)
 * @param {Object} notificationData - Dữ liệu thông báo
 * @param {number} notificationData.userId - ID người nhận
 * @param {string} notificationData.type - Loại thông báo
 * @param {string} notificationData.message - Nội dung thông báo
 * @param {string} notificationData.link - Link điều hướng (tùy chọn)
 * @param {number} notificationData.senderId - ID người gửi (tùy chọn)
 * @param {Object} notificationData.metadata - Dữ liệu bổ sung (tùy chọn)
 * @returns {Promise<Object>} - Thông báo đã tạo
 */
export const createNotification = async (notificationData) => {
  try {
    const response = await api.post('/notifications', notificationData);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi tạo thông báo:', error);
    throw error;
  }
};

/**
 * Tạo thông báo hàng loạt (chỉ dành cho admin/editor)
 * @param {Object} bulkData - Dữ liệu thông báo hàng loạt
 * @param {Array<number>} bulkData.userIds - Danh sách ID người nhận
 * @param {string} bulkData.type - Loại thông báo
 * @param {string} bulkData.message - Nội dung thông báo
 * @param {string} bulkData.link - Link điều hướng (tùy chọn)
 * @param {number} bulkData.senderId - ID người gửi (tùy chọn)
 * @param {Object} bulkData.metadata - Dữ liệu bổ sung (tùy chọn)
 * @returns {Promise<Object>} - Danh sách thông báo đã tạo
 */
export const createBulkNotifications = async (bulkData) => {
  try {
    const response = await api.post('/notifications/bulk', bulkData);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi tạo thông báo hàng loạt:', error);
    throw error;
  }
};

/**
 * Đánh dấu nhiều thông báo đã đọc.
 * @param {string[]} ids - Mảng ID của các thông báo.
 * @returns {Promise<Object>} - Kết quả từ server.
 */
export const markBulkAsRead = async (ids = []) => {
  try {
    // Endpoint mới: POST /api/notifications/mark-read
    const response = await api.post('/notifications/mark-read', { ids });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi đánh dấu nhiều thông báo đã đọc:', error);
    throw error;
  }
};

const notificationService = {
  fetchNotifications,
  fetchUnreadCount,
  getNotificationById,
  markNotificationAsRead,
  markBulkAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  createNotification,
  createBulkNotifications,
};

export default notificationService;
