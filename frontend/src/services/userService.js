import api from './api';

const getProfile = () => {
  return api.get('/users/me');
};

const updateProfile = (userData) => {
  return api.put('/users/me', userData);
};

const uploadAvatar = (formData) => {
  return api.post('/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

const uploadCover = (formData) => {
  return api.post('/users/me/cover', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Lấy thông tin người dùng theo UUID
const getUserByUuid = async (uuid) => {
  const res = await api.get(`/users/${uuid}`);
  return res.data;
};

// Lấy danh sách phim yêu thích của người dùng theo UUID
const getUserFavoritesByUuid = async (uuid, page = 1, limit = 10) => {
  const res = await api.get(`/users/${uuid}/favorites`, {
    params: { page, limit }
  });
  return res.data;
};

// Lấy lịch sử xem phim của người dùng theo UUID
const getUserWatchHistoryByUuid = async (uuid, page = 1, limit = 10) => {
  const res = await api.get(`/users/${uuid}/watch-history`, {
    params: { page, limit }
  });
  return res.data;
};

// Lấy danh sách bạn bè của người dùng theo UUID với pagination
const getUserFriendsByUuid = async (uuid, params = {}) => {
  const { page = 1, limit = 10 } = params;
  const res = await api.get(`/users/${uuid}/friends`, {
    params: { page, limit }
  });
  return res.data;
};

// Tìm kiếm người dùng theo username (phục vụ mention)
const searchUsers = async (q, limit = 10) => {
  const res = await api.get('/users/search', { params: { q, limit } });
  return res.data;
};

// Tìm kiếm trong danh sách bạn bè của current user (phục vụ mention)
const searchFriends = async (q, limit = 10) => {
  const res = await api.get('/users/search/friends', { params: { q, limit } });
  return res.data;
};

const userService = {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadCover,
  getUserByUuid,
  getUserFavoritesByUuid,
  getUserWatchHistoryByUuid,
  getUserFriendsByUuid,
  searchUsers,
  searchFriends,
};

export default userService;
