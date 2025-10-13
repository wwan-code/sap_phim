import api from './api';

const BASE_URL = '/episodes';

/**
 * @desc Lấy danh sách tập phim của một phim cụ thể
 * @param {string} movieId - ID của phim
 * @param {object} params - Các tham số query (page, limit)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const getEpisodesByMovieId = async (movieId, params) => {
  const response = await api.get(`/movies/${movieId}${BASE_URL}`, { params });
  return response.data;
};

/** 
 * @desc Lấy tất cả các tập phim (dành cho admin)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const getAllEpisodes = async () => {
  try {
    const response = await api.get(`${BASE_URL}/all`);
    return response.data;
  } catch (err) {
    throw err;
  }
};

/**
 * @desc Lấy danh sách tập phim của một phim cụ thể
 * @param {string} movieId - ID của phim
 * @param {object} params - Các tham số query (page, limit)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const getEpisodes = async (params) => {
  try {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
};

/**
 * @desc Lấy chi tiết một tập phim theo ID
 * @param {string} id - ID của tập phim
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const getEpisodeById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * @desc Tạo tập phim mới cho một phim
 * @param {string} movieId - ID của phim
 * @param {object} episodeData - Dữ liệu tập phim
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const createEpisode = (movieId, episodeData) => {
  return api.post(`/movies/${movieId}${BASE_URL}`, episodeData);
};

/**
 * @desc Cập nhật thông tin tập phim
 * @param {string} id - ID của tập phim
 * @param {object} episodeData - Dữ liệu tập phim cập nhật
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const updateEpisode = (id, episodeData) => {
  return api.put(`${BASE_URL}/${id}`, episodeData);
};

/**
 * @desc Xóa một tập phim
 * @param {string} id - ID của tập phim
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const deleteEpisode = (id) => {
  return api.delete(`${BASE_URL}/${id}`);
};

const episodeService = {
  getEpisodesByMovieId,
  getEpisodeById,
  getAllEpisodes,
  getEpisodes,
  createEpisode,
  updateEpisode,
  deleteEpisode,
};

export default episodeService;
