import api from './api';

const BASE_URL = '/series';

const getAllSeries = async () => {
  try {
    const response = await api.get(`${BASE_URL}/all`);
    return response.data;
  } catch (err) {
    throw err;
  }
};

/**
 * @desc Lấy danh sách series với phân trang
 * @param {object} params - Các tham số query (page, limit)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const getSeries = async (params) => {
  try {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
};

/**
 * @desc Lấy chi tiết một series theo ID
 * @param {string} id - ID của series
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const getSeriesById = (id) => {
  return api.get(`${BASE_URL}/${id}`);
};

/**
 * @desc Tạo series mới
 * @param {object} seriesData - Dữ liệu series
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const createSeries = (seriesData) => {
  return api.post(BASE_URL, seriesData);
};

/**
 * @desc Cập nhật thông tin series
 * @param {string} id - ID của series
 * @param {object} seriesData - Dữ liệu series cập nhật
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const updateSeries = (id, seriesData) => {
  return api.put(`${BASE_URL}/${id}`, seriesData);
};

/**
 * @desc Xóa một series
 * @param {string} id - ID của series
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const deleteSeries = (id) => {
  return api.delete(`${BASE_URL}/${id}`);
};

const seriesService = {
  getAllSeries,
  getSeries,
  getSeriesById,
  createSeries,
  updateSeries,
  deleteSeries,
};

export default seriesService;
