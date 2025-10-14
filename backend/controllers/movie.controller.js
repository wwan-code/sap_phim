import asyncHandler from 'express-async-handler';
import * as movieService from '../services/movie.service.js';

/**
 * @desc    Tìm kiếm phim
 * @route   GET /api/movies/search
 * @access  Public
 */
const searchMovies = asyncHandler(async (req, res) => {
  const result = await movieService.searchMovies(req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy tất cả phim (không phân trang)
 * @route   GET /api/movies/all
 * @access  Public
 */
const getAllMovies = asyncHandler(async (req, res) => {
  const movies = await movieService.getAllMoviesNoPagination();
  res.status(200).json({
    success: true,
    data: movies,
  });
});

/**
 * @desc    Lấy danh sách phim
 * @route   GET /api/movies
 * @access  Public
 */
const getMovies = asyncHandler(async (req, res) => {
  const result = await movieService.getMovies(req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy chi tiết một phim (dành cho admin)
 * @route   GET /api/movies/:id
 * @access  Public
 */
const getMovieById = asyncHandler(async (req, res) => {
  const movie = await movieService.getMovieById(req.params.id);
  if (movie) {
    res.status(200).json({
      success: true,
      data: movie,
    });
  } else {
    res.status(404);
    throw new Error('Phim không được tìm thấy.');
  }
});

/**
 * @desc    Lấy chi tiết phim theo slug (dành cho người dùng)
 * @route   GET /api/movie/detail/:slug
 * @access  Public (Optional Auth)
 */
const getMovieDetail = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user ? req.user.id : null; // userId sẽ có nếu verifyTokenOptional thành công

  const { movie, isFavorite } = await movieService.getMovieDetailBySlug(slug, userId);
  if (movie) {
    res.status(200).json({
      success: true,
      data: { ...movie.toJSON(), isFavorite },
    });
  } else {
    res.status(404);
    throw new Error('Phim không được tìm thấy.');
  }
});

/**
 * @desc    Lấy dữ liệu xem phim theo slug và episodeNumber (dành cho người dùng)
 * @route   GET /api/movie/watch/:slug/episode/:episodeNumber?
 * @access  Public (Optional Auth)
 */
const getMovieWatchData = asyncHandler(async (req, res) => {
  const { slug, episodeNumber } = req.params;
  const userId = req.user ? req.user.id : null; // userId sẽ có nếu verifyTokenOptional thành công

  const result = await movieService.getMovieWatchDataBySlug(slug, episodeNumber, userId);
  if (result.movie) {
    res.status(200).json({
      success: true,
      data: result,
    });
  } else {
    res.status(404);
    throw new Error('Phim hoặc tập phim không được tìm thấy.');
  }
});

/**
 * @desc    Tạo một phim mới
 * @route   POST /api/movies
 * @access  Private/Admin
 */
const createMovie = asyncHandler(async (req, res) => {
  // Dữ liệu JSON được gửi dưới dạng string trong multipart/form-data
  // Cần parse lại trước khi sử dụng
  const movieData = {};
  for (const key in req.body) {
    try {
      movieData[key] = JSON.parse(req.body[key]);
    } catch (e) {
      movieData[key] = req.body[key];
    }
  }
  
  const createdMovie = await movieService.createMovie(movieData, req.files);
  res.status(201).json({
    success: true,
    data: createdMovie,
    message: 'Tạo phim mới thành công.',
  });
});

/**
 * @desc    Cập nhật một phim
 * @route   PUT /api/movies/:id
 * @access  Private/Admin
 */
const updateMovie = asyncHandler(async (req, res) => {
  const movieData = {};
  for (const key in req.body) {
    try {
      movieData[key] = JSON.parse(req.body[key]);
    } catch (e) {
      movieData[key] = req.body[key];
    }
  }

  const updatedMovie = await movieService.updateMovie(req.params.id, movieData, req.files);
  res.status(200).json({
    success: true,
    data: updatedMovie,
    message: 'Cập nhật phim thành công.',
  });
});

/**
 * @desc    Xóa một phim
 * @route   DELETE /api/movies/:id
 * @access  Private/Admin
 */
const deleteMovie = asyncHandler(async (req, res) => {
  await movieService.deleteMovie(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Xóa phim thành công.',
  });
});

/**
 * @desc    Lấy danh sách phim trending
 * @route   GET /api/home/trending
 * @access  Public
 */
const getTrendingMovies = asyncHandler(async (req, res) => {
  const result = await movieService.getTrendingMovies(req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy danh sách phim mới cập nhật
 * @route   GET /api/home/latest
 * @access  Public
 */
const getLatestMovies = asyncHandler(async (req, res) => {
  const result = await movieService.getLatestMovies(req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy danh sách phim cùng thể loại
 * @route   GET /api/movies/:id/similar
 * @access  Public
 */
const getSimilarMovies = asyncHandler(async (req, res) => {
  const result = await movieService.getSimilarMovies(req.params.id, req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy danh sách phim cùng series
 * @route   GET /api/movies/:id/series
 * @access  Public
 */
const getMoviesInSameSeries = asyncHandler(async (req, res) => {
  const result = await movieService.getMoviesInSameSeries(req.params.id, req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy danh sách tập của một phim
 * @route   GET /api/movies/:id/episodes
 * @access  Public
 */
const getMovieEpisodes = asyncHandler(async (req, res) => {
  const result = await movieService.getMovieEpisodes(req.params.id);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy danh sách phim đề xuất
 * @route   GET /api/movies/:id/recommendations
 * @access  Public
 */
const getRecommendedMovies = asyncHandler(async (req, res) => {
  const result = await movieService.getRecommendedMovies(req.params.id, req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy danh sách top 10 phim đáng xem
 * @route   GET /api/home/movies/top10
 * @access  Public
 */
const getTop10Movies = asyncHandler(async (req, res) => {
  const result = await movieService.getTop10Movies();
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy danh sách phim chiếu rạp
 * @route   GET /api/home/theater
 * @access  Public
 */
const getTheaterMovies = asyncHandler(async (req, res) => {
  const result = await movieService.getTheaterMovies(req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

export {
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
  getMovieDetail,
  getMovieWatchData,
};
