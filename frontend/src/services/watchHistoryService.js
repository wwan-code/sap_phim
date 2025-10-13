import api from './api';

const saveProgress = async ({ movieId, episodeId, progress, timestamp }) => {
  const response = await api.post('/watch-history', { movieId, episodeId, progress, timestamp });
  return response.data; // Returns { success, data, message }
};

const getHistory = async ({ page = 1, limit = 12 } = {}) => {
  const response = await api.get('/watch-history', { params: { page, limit } });
  return response.data; // Returns { success, data: items, message, meta }
};

const deleteOne = async (id) => {
  const response = await api.delete(`/watch-history/${id}`);
  return response.data; // Returns { success, data, message }
};

const clearAll = async () => {
  const response = await api.delete('/watch-history');
  return response.data; // Returns { success, data, message }
};

export default { saveProgress, getHistory, deleteOne, clearAll };
