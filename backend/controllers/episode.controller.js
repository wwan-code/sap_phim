import asyncHandler from 'express-async-handler';
import * as episodeService from '../services/episode.service.js';

/**
 * @desc    Lấy danh sách tập phim của một phim
 * @route   GET /api/movies/:movieId/episodes
 * @access  Public
 */
const getEpisodesOfMovie = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  const result = await episodeService.getEpisodesByMovieId(movieId, req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

const getAllEpisodes = asyncHandler(async (req, res) => {
  const result = await episodeService.getAllEpisodes();
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Lấy danh sách tất cả tập phim với phân trang và lọc
 * @route   GET /api/episodes
 * @access  Private/Admin
 */
const getEpisodes = asyncHandler(async (req, res) => {
  const result = await episodeService.getEpisodes(req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * @desc    Lấy chi tiết một tập phim
 * @route   GET /api/episodes/:id
 * @access  Public
 */
const getEpisodeById = asyncHandler(async (req, res) => {
  const episode = await episodeService.getEpisodeById(req.params.id);
  if (episode) {
    res.status(200).json({
      success: true,
      data: episode,
    });
  } else {
    res.status(404);
    throw new Error('Tập phim không được tìm thấy.');
  }
});

/**
 * @desc    Tạo một tập phim mới
 * @route   POST /api/movies/:movieId/episodes
 * @access  Private/Admin
 */
const createEpisode = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  const createdEpisode = await episodeService.createEpisode(movieId, req.body);
  res.status(201).json({
    success: true,
    data: createdEpisode,
    message: 'Tạo tập phim mới thành công.',
  });
});

/**
 * @desc    Cập nhật một tập phim
 * @route   PUT /api/episodes/:id
 * @access  Private/Admin
 */
const updateEpisode = asyncHandler(async (req, res) => {
  const updatedEpisode = await episodeService.updateEpisode(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: updatedEpisode,
    message: 'Cập nhật tập phim thành công.',
  });
});

/**
 * @desc    Xóa một tập phim
 * @route   DELETE /api/episodes/:id
 * @access  Private/Admin
 */
const deleteEpisode = asyncHandler(async (req, res) => {
  await episodeService.deleteEpisode(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Xóa tập phim thành công.',
  });
});

export {
  getEpisodesOfMovie,
  getAllEpisodes,
  getEpisodes,
  getEpisodeById,
  createEpisode,
  updateEpisode,
  deleteEpisode,
};
