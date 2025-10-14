import { getDashboardAnalytics, getTrendingMoviesByPeriod } from '../services/dashboard.service.js';

/**
 * @desc Lấy dữ liệu phân tích cho Dashboard Admin
 * @route GET /api/dashboard/analytics
 * @access Private/Admin
 */
const getAnalytics = async (req, res, next) => {
  try {
    const analyticsData = await getDashboardAnalytics();
    res.status(200).json(analyticsData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Lấy danh sách phim trending theo khoảng thời gian
 * @route GET /api/dashboard/trending-movies/:period
 * @access Private/Admin
 */
const getTrendingMovies = async (req, res, next) => {
  try {
    const { period } = req.params;
    const { limit } = req.query; // Optional limit
    const trendingMovies = await getTrendingMoviesByPeriod(period, parseInt(limit));
    res.status(200).json(trendingMovies);
  } catch (error) {
    next(error);
  }
};

export { getAnalytics, getTrendingMovies };
