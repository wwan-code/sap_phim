import express from 'express';
import * as episodeController from '../controllers/episode.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Nested routes under /api/movies/:movieId/episodes
const movieRouter = express.Router({ mergeParams: true });

// @route   GET /api/movies/:movieId/episodes
// @desc    Lấy danh sách tập phim của một phim
// @access  Public
movieRouter.get('/', episodeController.getEpisodesOfMovie);

// @route   POST /api/movies/:movieId/episodes
// @desc    Tạo tập phim mới cho một phim
// @access  Private/Admin
movieRouter.post(
  '/',
  verifyToken,
  authorizeRoles('admin'),
  episodeController.createEpisode
);

// @route   PUT /api/episodes/all
// @desc    Lấy tất cả các tập phim (không phân trang)
// @access  Private/Admin
router.get('/episodes/all', verifyToken, authorizeRoles('admin'), episodeController.getAllEpisodes);

// @route   PUT /api/episodes
// @desc    Lấy danh sách tất cả tập phim với phân trang và lọc
// @access  Private/Admin
router.get('/episodes', verifyToken, authorizeRoles('admin'), episodeController.getEpisodes);

// Top-level routes for individual episodes
// @route   GET /api/episodes/:id
// @desc    Lấy chi tiết một tập phim
// @access  Public
router.get('/episodes/:id', episodeController.getEpisodeById);

// @route   PUT /api/episodes/:id
// @desc    Cập nhật một tập phim
// @access  Private/Admin
router.put(
  '/episodes/:id',
  verifyToken,
  authorizeRoles('admin'),
  episodeController.updateEpisode
);

// @route   DELETE /api/episodes/:id
// @desc    Xóa một tập phim
// @access  Private/Admin
router.delete(
  '/episodes/:id',
  verifyToken,
  authorizeRoles('admin'),
  episodeController.deleteEpisode
);

// Gắn router con vào router chính
router.use('/movies/:movieId/episodes', movieRouter);

export default router;
