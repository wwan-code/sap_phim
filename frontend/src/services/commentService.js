import api from './api';

const BASE_URL = '/comments';

/**
 * @desc Lấy bình luận trả lời theo parentId
 * @param {number} parentId - ID của comment cha
 * @param {object} params - Các tham số query (page, limit, sort)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getReplies(parentId, params = {}) {
  try {
    const response = await api.get(`${BASE_URL}/${parentId}/replies`, { params });
    return response;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy bình luận theo contentType và contentId
 * @param {string} contentType - Loại nội dung ('movie' | 'episode')
 * @param {number} contentId - ID của nội dung
 * @param {object} params - Các tham số query (page, limit, sort)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getComments(contentType, contentId, params = {}) {
  try {
    const response = await api.get(`${BASE_URL}/${contentType}/${contentId}`, { params });
    return response;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy bình luận theo phim + tất cả episodes (merge)
 * @param {number} movieId - ID của phim
 * @param {object} params - Các tham số query (page, limit, sort)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getMovieCommentsWithEpisodes(movieId, params = {}) {
  try {
    const response = await api.get(`${BASE_URL}/movie/${movieId}/with-episodes`, { params });
    return response;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Tạo bình luận mới
 * @param {object} commentData - Dữ liệu bình luận
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function createComment(commentData) {
  try {
    const response = await api.post(BASE_URL, commentData);
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Cập nhật bình luận
 * @param {number} id - ID của bình luận
 * @param {object} commentData - Dữ liệu cập nhật
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function updateComment(id, commentData) {
  try {
    const response = await api.put(`${BASE_URL}/${id}`, commentData);
    return response;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Xóa bình luận
 * @param {number} id - ID của bình luận
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function deleteComment(id) {
  try {
    const response = await api.delete(`${BASE_URL}/${id}`);
    return response;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Like/Unlike bình luận
 * @param {number} id - ID của bình luận
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function toggleLike(id) {
  try {
    const response = await api.post(`${BASE_URL}/${id}/like`);
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Report bình luận
 * @param {number} id - ID của bình luận
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function reportComment(id) {
  try {
    const response = await api.post(`${BASE_URL}/${id}/report`);
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy danh sách bình luận bị báo cáo (Admin)
 * @param {object} params - Các tham số query (page, limit, sort, minReports, userId, contentId, contentType, startDate, endDate)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getReportedComments(params = {}) {
  try {
    const response = await api.get(`${BASE_URL}/admin/reported`, { params });
    return response;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy thống kê bình luận cho Admin
 * @param {object} params - Các tham số query (startDate, endDate, contentType, contentId, userId)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getCommentStatsAdmin(params = {}) {
  try {
    const response = await api.get(`${BASE_URL}/admin/stats`, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Duyệt bình luận (Admin)
 * @param {number} id - ID của bình luận
 * @param {boolean} isApproved - Trạng thái duyệt
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function approveComment(id, isApproved) {
  try {
    const response = await api.put(`${BASE_URL}/${id}/approve`, { isApproved });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Ghim bình luận (Admin)
 * @param {number} id - ID của bình luận
 * @param {boolean} isPinned - Trạng thái ghim
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function pinComment(id, isPinned) {
  try {
    const response = await api.put(`${BASE_URL}/${id}/pin`, { isPinned });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Ẩn bình luận (Admin)
 * @param {number} id - ID của bình luận
 * @param {boolean} isHidden - Trạng thái ẩn
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function hideComment(id, isHidden) {
  try {
    const response = await api.put(`${BASE_URL}/${id}/hide`, { isHidden });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Xóa bình luận (Admin)
 * @param {number} id - ID của bình luận
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function deleteCommentByAdmin(id) {
  try {
    const response = await api.delete(`${BASE_URL}/${id}/admin`);
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Kiểm tra có thể reply comment không
 * @param {number} commentId - ID của comment
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function canReplyToComment(commentId) {
  try {
    // Utility function - có thể implement logic client-side hoặc gọi API
    const response = await api.get(`${BASE_URL}/${commentId}/can-reply`);
    return response.data;
  } catch (err) {
    // Fallback logic nếu API không có
    return { success: true, data: { canReply: true } };
  }
}

/**
 * @desc Lấy thống kê comment
 * @param {string} contentType - Loại nội dung
 * @param {number} contentId - ID của nội dung
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getCommentStats(contentType, contentId) {
  try {
    const response = await api.get(`${BASE_URL}/stats/${contentType}/${contentId}`);
    return response.data;
  } catch (err) {
    // Fallback với dữ liệu mặc định
    return {
      success: true,
      data: {
        total: 0,
        rootComments: 0,
        replies: 0,
        latest: null
      }
    };
  }
}

/**
 * @desc Tìm kiếm comment
 * @param {object} params - Các tham số tìm kiếm
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function searchComments(params) {
  try {
    const response = await api.get(`${BASE_URL}/search`, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy thông tin comment cụ thể và parent chain
 * @param {number} commentId - ID của comment
 * @returns {Promise<object>} Dữ liệu comment và parent IDs
 */
async function getCommentWithParents(commentId) {
  try {
    const response = await api.get(`${BASE_URL}/${commentId}/with-parents`);
    return response.data;
  } catch (err) {
    throw err;
  }
}

const commentService = {
  getReplies,
  getComments,
  getMovieCommentsWithEpisodes,
  createComment,
  updateComment,
  deleteComment,
  toggleLike,
  reportComment,
  getReportedComments, // Export new admin function
  getCommentStatsAdmin, // Export new admin function
  approveComment,
  pinComment,
  hideComment,
  deleteCommentByAdmin,
  canReplyToComment,
  getCommentStats,
  searchComments,
  getCommentWithParents,
};

export default commentService;
