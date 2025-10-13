import api from './api';

const BASE_URL = '/sections';

const getAllSections = async () => {
  try {
    const response = await api.get(`${BASE_URL}/all`);
    return response.data;
  } catch (err) {
    throw err;
  }
};

/**
 * @desc Lấy danh sách sections, có thể lọc theo movieId hoặc seriesId
 * @param {object} params - Các tham số query (movieId, seriesId)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const getSections = async (params) => {
  try {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
};

/**
 * @desc Lấy chi tiết một section theo ID
 * @param {string} id - ID của section
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const getSectionById = (id) => {
  return api.get(`${BASE_URL}/${id}`);
};

/**
 * @desc Tạo section mới
 * @param {object} sectionData - Dữ liệu section
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const createSection = (sectionData) => {
  return api.post(BASE_URL, sectionData);
};

/**
 * @desc Cập nhật thông tin section
 * @param {string} id - ID của section
 * @param {object} sectionData - Dữ liệu section cập nhật
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const updateSection = (id, sectionData) => {
  return api.put(`${BASE_URL}/${id}`, sectionData);
};

/**
 * @desc Xóa một section
 * @param {string} id - ID của section
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
const deleteSection = (id) => {
  return api.delete(`${BASE_URL}/${id}`);
};

const sectionsService = {
  getAllSections,
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
};

export default sectionsService;
