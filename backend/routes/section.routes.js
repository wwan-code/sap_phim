import express from 'express';
import * as sectionController from '../controllers/section.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Nested route under /api/movies/:movieId/sections
const movieRouter = express.Router({ mergeParams: true });

// @route   GET /api/movies/:movieId/sections
// @desc    Lấy danh sách section của một phim
// @access  Public
movieRouter.get('/', sectionController.getSectionOfMovie);


// Top-level routes for sections
// @route   GET /api/sections
// @desc    Lấy danh sách tất cả sections với phân trang và lọc
// @access  Public
router.get('/', sectionController.getSections);

// @route   GET /api/sections/:id
// @desc    Lấy chi tiết một section
// @access  Public
router.get('/:id', sectionController.getSectionById);

// @route   POST /api/sections
// @desc    Tạo section mới
// @access  Private/Admin
router.post(
  '/',
  verifyToken,
  authorizeRoles('admin'),
  sectionController.createSection
);

// @route   PUT /api/sections/:id
// @desc    Cập nhật section
// @access  Private/Admin
router.put(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  sectionController.updateSection
);

// @route   DELETE /api/sections/:id
// @desc    Xóa section
// @access  Private/Admin
router.delete(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  sectionController.deleteSection
);

// Gắn router con vào router chính
router.use('/movies/:movieId/sections', movieRouter);

export default router;
