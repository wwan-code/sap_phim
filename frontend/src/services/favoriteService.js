import api from './api';

const add = async (movieId) => {
  const response = await api.post(`/favorites/${movieId}`);
  return response.data; // Returns { success, data, message }
};

const remove = async (movieId) => {
  const response = await api.delete(`/favorites/${movieId}`);
  return response.data; // Returns { success, data, message }
};

const list = async ({ page = 1, limit = 12, genre = '', sort = 'dateAdded' } = {}) => {
  const response = await api.get('/favorites', { params: { page, limit, genre, sort } });
  return response.data; // Returns { success, data: items, message, meta }
};

const check = async (movieId) => {
  const response = await api.get(`/favorites/${movieId}/check`);
  return response.data; // Returns { success, data: { isFavorite }, message }
};

const favoriteService = { add, remove, list, check };

export default favoriteService;