import express from 'express';
import * as movieController from '../controllers/movie.controller.js';
import { verifyToken, authorizeRoles, verifyTokenOptional } from '../middlewares/auth.middleware.js';
import { uploadMovieImages, handleUploadError } from '../middlewares/uploadMovie.middleware.js';

const router = express.Router();

// @route   GET /api/movies/search
// @desc    Tìm kiếm phim
// @access  Public
router.get('/movies/search', movieController.searchMovies);

// @route   GET /api/movies
// @desc    Lấy danh sách phim với bộ lọc
// @access  Public
router.get('/movies', movieController.getMovies);

// @route   GET /api/movies/all
// @desc    Lấy tất cả phim (không phân trang)
// @access  Public
router.get('/movies/all', movieController.getAllMovies);

// @route   GET /api/movies/:id
// @desc    Lấy chi tiết một phim (Dành cho Admin)
// @access  Private/Admin
router.get('/movies/:id', verifyToken, authorizeRoles('admin'), movieController.getMovieById);

// @route   GET /api/movie/detail/:slug
// @desc    Lấy chi tiết phim theo slug (Dành cho người dùng)
// @access  Public (Optional Auth)
router.get('/movie/detail/:slug', verifyTokenOptional, movieController.getMovieDetail);

// @route   GET /api/movie/watch/:slug/episode/:episodeNumber?
// @desc    Lấy dữ liệu xem phim theo slug và episodeNumber (Dành cho người dùng)
// @access  Public (Optional Auth)
router.get('/movie/watch/:slug/episode/:episodeNumber?', verifyTokenOptional, movieController.getMovieWatchData);
router.get('/movie/watch/:slug', verifyTokenOptional, movieController.getMovieWatchData); // Route cho phim lẻ hoặc tập đầu tiên của phim bộ

// @route   POST /api/movies
// @desc    Tạo phim mới
// @access  Private/Admin
router.post(
  '/movies',
  verifyToken,
  authorizeRoles('admin'),
  uploadMovieImages,
  handleUploadError,
  movieController.createMovie
);

// @route   PUT /api/movies/:id
// @desc    Cập nhật phim
// @access  Private/Admin
router.put(
  '/movies/:id',
  verifyToken,
  authorizeRoles('admin'),
  uploadMovieImages,
  handleUploadError,
  movieController.updateMovie
);

// @route   DELETE /api/movies/:id
// @desc    Xóa phim
// @access  Private/Admin
router.delete(
  '/movies/:id',
  verifyToken,
  authorizeRoles('admin'),
  movieController.deleteMovie
);

// --- HomePage Specific Routes ---
// @route   GET /api/home/movies
// @desc    Lấy danh sách phim (có phân trang, filter theo year, genre, country)
// @access  Public
router.get('/home/movies', movieController.getMovies); // Re-use existing getMovies with different path

// @route   GET /api/home/trending
// @desc    Phim trending (theo views)
// @access  Public
router.get('/home/trending', movieController.getTrendingMovies);

// @route   GET /api/home/latest
// @desc    Phim mới cập nhật
// @access  Public
router.get('/home/latest', movieController.getLatestMovies);

// @route   GET /api/home/movies/top10
// @desc    Top 10 phim đáng xem
// @access  Public
router.get('/home/movies/top10', movieController.getTop10Movies);

// @route   GET /api/home/theater
// @desc    Phim chiếu rạp
// @access  Public
router.get('/home/theater', movieController.getTheaterMovies);

// --- Movie Detail Page Specific Routes ---
// @route   GET /api/movies/:id/similar
// @desc    Danh sách phim cùng thể loại
// @access  Public
router.get('/movies/:id/similar', movieController.getSimilarMovies);

// @route   GET /api/movies/:id/series
// @desc    Danh sách phim cùng series
// @access  Public
router.get('/movies/:id/series', movieController.getMoviesInSameSeries);

// --- Watch Page Specific Routes ---
// @route   GET /api/movies/:id/episodes
// @desc    Danh sách tập của phim
// @access  Public
router.get('/movies/:id/episodes', movieController.getMovieEpisodes);

// @route   GET /api/movies/:id/recommendations
// @desc    Danh sách phim đề xuất
// @access  Public
router.get('/movies/:id/recommendations', movieController.getRecommendedMovies);

export default router;
