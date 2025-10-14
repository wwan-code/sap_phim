import express from 'express';
import * as commentController from '../controllers/comment.controller.js';
import { verifyToken, authorizeRoles, verifyTokenOptional } from '../middlewares/auth.middleware.js';
import enforceCommentDepth from '../middlewares/enforceCommentDepth.middleware.js';

const router = express.Router();


// Private routes (User must be logged in)
router.post('/', verifyToken, enforceCommentDepth, commentController.createComment); // POST /api/comments
router.put('/:id', verifyToken, commentController.updateComment); // PUT /api/comments/:id
router.delete('/:id', verifyToken, commentController.deleteComment); // DELETE /api/comments/:id
router.post('/:id/like', verifyToken, commentController.likeComment); // POST /api/comments/:id/like
router.post('/:id/report', verifyToken, commentController.reportComment); // POST /api/comments/:id/report

// Admin routes (User must be admin)
router.get('/admin/reported', verifyToken, authorizeRoles('admin'), commentController.getReportedComments); // GET /api/comments/admin/reported
router.get('/admin/stats', verifyToken, authorizeRoles('admin'), commentController.getCommentStatsAdmin); // GET /api/comments/admin/stats
router.put('/:id/approve', verifyToken, authorizeRoles('admin'), commentController.approveComment); // PUT /api/comments/:id/approve
router.put('/:id/pin', verifyToken, authorizeRoles('admin'), commentController.pinComment); // PUT /api/comments/:id/pin
router.put('/:id/hide', verifyToken, authorizeRoles('admin'), commentController.hideComment); // PUT /api/comments/:id/hide
router.delete('/:id/admin', verifyToken, authorizeRoles('admin'), commentController.adminDeleteComment); // DELETE /api/comments/:id/admin

// Public routes
router.get('/:parentId/replies', verifyTokenOptional, commentController.getReplies); // GET /api/comments/:parentId/replies
router.get('/:id/with-parents', verifyTokenOptional, commentController.getCommentWithParents); // GET /api/comments/:id/with-parents

router.get('/:contentType/:contentId', verifyTokenOptional, commentController.getComments); // GET /api/comments/movie/:contentId or /api/comments/episode/:contentId
router.get('/movie/:movieId/with-episodes', verifyTokenOptional, commentController.getCommentsForMovieWithEpisodes); // GET /api/comments/movie/:movieId/with-episodes

export default router;
