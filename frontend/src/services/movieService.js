import api from './api';

const BASE_URL = '/movies';

/**
 * @desc Lấy tất cả phim (không phân trang)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getAllMovies() {
  try {
    const response = await api.get(`${BASE_URL}/all`);
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy danh sách phim với các bộ lọc và phân trang
 * @param {object} params - Các tham số query (page, limit, q, genre, country, category, year, sort)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getMovies(params) {
  try {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy chi tiết một phim theo ID
 * @param {string} id - ID của phim
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getMovieById(id) {
  try {
    const response = await api.get(`${BASE_URL}/${id}`);
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Tạo phim mới
 * @param {FormData} movieData - Dữ liệu phim (bao gồm cả file) dưới dạng FormData
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
function createMovie(movieData) {
  return api.post(BASE_URL, movieData, {
    headers: {
      'Content-Type': 'multipart/form-data', // Quan trọng khi gửi file
    },
  });
}

/**
 * @desc Cập nhật thông tin phim
 * @param {string} id - ID của phim
 * @param {FormData} movieData - Dữ liệu phim (bao gồm cả file) dưới dạng FormData
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
function updateMovie(id, movieData) {
  return api.put(`${BASE_URL}/${id}`, movieData, {
    headers: {
      'Content-Type': 'multipart/form-data', // Quan trọng khi gửi file
    },
  });
}

/**
 * @desc Xóa một phim
 * @param {string} id - ID của phim
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
function deleteMovie(id) {
  return api.delete(`${BASE_URL}/${id}`);
}

/**
 * @desc Lấy danh sách phim trending
 * @param {object} params - Các tham số query (limit)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getTrendingMovies(params) {
  try {
    const response = await api.get(`/home/trending`, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy danh sách phim mới nhất
 * @param {object} params - Các tham số query (limit)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getLatestMovies(params) {
  try {
    const response = await api.get(`/home/latest`, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy danh sách phim tương tự (cùng thể loại)
 * @param {string} movieId - ID của phim
 * @param {object} params - Các tham số query (limit)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getSimilarMovies(movieId, params) {
  try {
    const response = await api.get(`${BASE_URL}/${movieId}/similar`, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy danh sách phim cùng series
 * @param {string} movieId - ID của phim
 * @param {object} params - Các tham số query (limit)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getMoviesInSameSeries(movieId, params) {
  try {
    const response = await api.get(`${BASE_URL}/${movieId}/series`, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy danh sách tập phim
 * @param {string} movieId - ID của phim
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getMovieEpisodes(movieId) {
  try {
    const response = await api.get(`${BASE_URL}/${movieId}/episodes`);
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy danh sách phim được đề xuất
 * @param {string} movieId - ID của phim
 * @param {object} params - Các tham số query (limit)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getRecommendedMovies(movieId, params) {
  try {
    const response = await api.get(`${BASE_URL}/${movieId}/recommendations`, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Tìm kiếm phim
 * @param {object} params - Các tham số query (q, page, limit)
 * @param {AbortSignal} signal - Signal để hủy request
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function searchMovies(params, signal) {
  try {
    const response = await api.get(`${BASE_URL}/search`, { params, signal });
    return response.data;
  } catch (err) {
    if (axios.isCancel(err)) {
      console.log('Request canceled:', err.message);
    }
    // Không throw lỗi khi request bị hủy, để component tự xử lý
    if (!axios.isCancel(err)) {
      throw err;
    }
  }
}

/**
 * @desc Lấy danh sách top 10 phim
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getTop10Movies() {
  try {
    const response = await api.get(`/home/movies/top10`);
    return response.data;
  } catch (err) {
    throw err;
  }
}

/**
 * @desc Lấy danh sách phim chiếu rạp
 * @param {object} params - Các tham số query (limit)
 * @returns {Promise<object>} Dữ liệu phản hồi từ API
 */
async function getTheaterMovies(params) {
  try {
    const response = await api.get(`/home/theater`, { params });
    return response.data;
  } catch (err) {
    throw err;
  }
}

const movieService = {
  searchMovies,
  getAllMovies,
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getTrendingMovies,
  getLatestMovies,
  getSimilarMovies,
  getMoviesInSameSeries,
  getMovieEpisodes,
  getRecommendedMovies,
  getTop10Movies,
  getTheaterMovies,
};

export default movieService;
