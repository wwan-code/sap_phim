import express from 'express';
import * as seriesController from '../controllers/series.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// @route   GET /api/series
// @desc    Lấy danh sách series
// @access  Public
router.get('/', seriesController.getSeries);

// @route   GET /api/series/all
// @desc    Lấy tất cả series (không phân trang)
// @access  Public
router.get('/all', seriesController.getAllSeries);

// @route   GET /api/series/:id
// @desc    Lấy chi tiết một series
// @access  Public
router.get('/:id', seriesController.getSeriesById);

// @route   POST /api/series
// @desc    Tạo series mới
// @access  Private/Admin
router.post(
  '/',
  verifyToken,
  authorizeRoles('admin'),
  seriesController.createSeries
);

// @route   PUT /api/series/:id
// @desc    Cập nhật series
// @access  Private/Admin
router.put(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  seriesController.updateSeries
);

// @route   DELETE /api/series/:id
// @desc    Xóa series
// @access  Private/Admin
router.delete(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  seriesController.deleteSeries
);

export default router;
