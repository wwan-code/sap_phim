import express from 'express';
import { body, query, param } from 'express-validator';
import * as ReelController from '../controllers/reel.controller.js';
import { verifyToken, authorizeRoles, verifyTokenOptional } from '../middlewares/auth.middleware.js';
import { uploadReel, handleUploadError } from '../middlewares/uploadReel.middleware.js';
import { createRateLimiter, uploadLimiter, likeLimiter, commentLimiter, viewLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// Public routes (can be accessed by logged-in or guest users)
router.get('/', verifyTokenOptional, ReelController.getReelFeed);
router.get('/trending', ReelController.getTrendingReels);
router.get('/:identifier', verifyTokenOptional, ReelController.getReelByIdentifier);
router.get('/:id/comments', ReelController.getReelComments);
router.get('/:id/similar', verifyTokenOptional, ReelController.getSimilarReels);
router.get('/user/:userId', verifyTokenOptional, [param('userId').isInt().withMessage('User ID không hợp lệ.')], ReelController.getUserReels);

// Private routes (requires authentication)
router.post(
  '/',
  verifyToken,
  authorizeRoles('user', 'editor', 'admin'),
  uploadLimiter,
  uploadReel,
  handleUploadError,
  [
    body('caption').optional().isString().trim().isLength({ max: 500 }).withMessage('Caption không được quá 500 ký tự.'),
    body('music').optional().isString().trim().isLength({ max: 255 }).withMessage('Music không được quá 255 ký tự.'),
    body('tags').optional().isString().custom((value) => {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed) || !parsed.every(tag => typeof tag === 'string' && tag.length > 0)) {
          throw new Error('Tags phải là một mảng các chuỗi không rỗng.');
        }
        return true;
      } catch (e) {
        throw new Error('Tags phải là một chuỗi JSON hợp lệ của một mảng.');
      }
    }),
    body('visibility').optional().isIn(['public', 'friends', 'private']).withMessage('Visibility không hợp lệ.'),
  ],
  ReelController.createReel
);

router.put(
  '/:id',
  verifyToken,
  authorizeRoles('user', 'editor', 'admin'),
  [
    param('id').isInt().withMessage('ID Reel không hợp lệ.'),
    body('caption').optional().isString().trim().isLength({ max: 500 }).withMessage('Caption không được quá 500 ký tự.'),
    body('music').optional().isString().trim().isLength({ max: 255 }).withMessage('Music không được quá 255 ký tự.'),
    body('tags').optional().isString().custom((value) => {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed) || !parsed.every(tag => typeof tag === 'string' && tag.length > 0)) {
          throw new Error('Tags phải là một mảng các chuỗi không rỗng.');
        }
        return true;
      } catch (e) {
        throw new Error('Tags phải là một chuỗi JSON hợp lệ của một mảng.');
      }
    }),
    body('visibility').optional().isIn(['public', 'friends', 'private']).withMessage('Visibility không hợp lệ.'),
  ],
  ReelController.updateReel
);

router.delete(
  '/:id',
  verifyToken,
  authorizeRoles('user', 'editor', 'admin'),
  [
    param('id').isInt().withMessage('ID Reel không hợp lệ.'),
  ],
  ReelController.deleteReel
);

router.post(
  '/:id/like',
  verifyToken,
  authorizeRoles('user', 'editor', 'admin'),
  likeLimiter,
  [
    param('id').isInt().withMessage('ID Reel không hợp lệ.'),
  ],
  ReelController.toggleLikeReel
);

router.post(
  '/:id/comments',
  verifyToken,
  authorizeRoles('user', 'editor', 'admin'),
  commentLimiter,
  [
    param('id').isInt().withMessage('ID Reel không hợp lệ.'),
    body('content').notEmpty().withMessage('Nội dung bình luận không được để trống.').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Nội dung bình luận phải từ 1 đến 500 ký tự.'),
    body('parentId').optional().isInt().withMessage('Parent ID không hợp lệ.'),
  ],
  ReelController.addReelComment
);

// AI routes
router.post(
  '/ai/suggest-caption',
  verifyToken,
  authorizeRoles('user', 'editor', 'admin'),
  createRateLimiter({ max: 5, windowMs: 60 * 1000 }), // 5 requests per minute
  [
    body('videoDescription').notEmpty().withMessage('Mô tả video là bắt buộc.').isString().trim(),
  ],
  ReelController.suggestAICaptionAndHashtags
);

router.post(
  '/ai/analyze-content',
  verifyToken,
  authorizeRoles('user', 'editor', 'admin'),
  createRateLimiter({ max: 2, windowMs: 60 * 1000 }), // 2 requests per minute
  [
    body('videoUrl').notEmpty().withMessage('URL video là bắt buộc.').isURL().withMessage('URL video không hợp lệ.'),
  ],
  ReelController.analyzeReelContent
);

// Admin routes (requires admin/editor roles)
router.get(
  '/admin',
  verifyToken,
  authorizeRoles('admin', 'editor'),
  ReelController.getAllReelsAdmin
);

router.put(
  '/admin/:id/status',
  verifyToken,
  authorizeRoles('admin', 'editor'),
  [
    param('id').isInt().withMessage('ID Reel không hợp lệ.'),
    body('status').isIn(['pending', 'processing', 'completed', 'failed', 'hidden', 'banned']).withMessage('Trạng thái không hợp lệ.'),
  ],
  ReelController.updateReelStatusAdmin
);

router.delete(
  '/admin/:id',
  verifyToken,
  authorizeRoles('admin'),
  [
    param('id').isInt().withMessage('ID Reel không hợp lệ.'),
  ],
  ReelController.deleteReelAdmin
);

router.get(
  '/stats',
  verifyToken,
  ReelController.getReelStats
);

export default router;
