import api from './api';

/**
 * Lấy danh sách bạn bè với pagination
 * @param {Object} params - { page, limit, q }
 * @returns {Promise}
 */
const getFriends = (params = {}) => {
  const { page = 1, limit = 10, q } = params;
  const queryParams = new URLSearchParams();
  queryParams.append('page', page);
  queryParams.append('limit', limit);
  if (q) queryParams.append('q', q);
  
  return api.get(`/friends?${queryParams.toString()}`);
};

/**
 * Lấy danh sách lời mời đang chờ với pagination
 * @param {Object} params - { page, limit }
 * @returns {Promise}
 */
const getPendingRequests = (params = {}) => {
  const { page = 1, limit = 10 } = params;
  return api.get(`/friends/pending?page=${page}&limit=${limit}`);
};

/**
 * Lấy danh sách lời mời đã gửi với pagination
 * @param {Object} params - { page, limit }
 * @returns {Promise}
 */
const getSentRequests = (params = {}) => {
  const { page = 1, limit = 10 } = params;
  return api.get(`/friends/sent?page=${page}&limit=${limit}`);
};

const sendRequest = (userId) => {
  return api.post(`/friends/invite/${userId}`);
};

const acceptRequest = (inviteId) => {
  return api.post(`/friends/accept/${inviteId}`);
};

const rejectRequest = (inviteId) => {
  return api.post(`/friends/reject/${inviteId}`);
};

const removeFriend = (friendId) => {
  return api.delete(`/friends/remove/${friendId}`);
};

/**
 * Tìm kiếm người dùng với pagination
 * @param {string} query - Search query
 * @param {Object} params - { limit, offset }
 * @returns {Promise}
 */
const searchUsers = (query, params = {}) => {
  const { limit = 10, offset = 0 } = params;
  return api.get(`/friends/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
};

const friendService = {
  getFriends,
  getPendingRequests,
  getSentRequests,
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
  searchUsers,
};

export default friendService;
