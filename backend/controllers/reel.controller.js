import asyncHandler from 'express-async-handler';
import * as ReelService from '../services/reel.service.js';
import AppError from '../utils/appError.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';
import { validateVideo } from '../utils/video.utils.js';

// ==================== REEL CRUD OPERATIONS ====================

/**
 * @desc Tạo Reel mới với validation đầy đủ
 * @route POST /api/reels
 * @access Private
 */
export const createReel = asyncHandler(async (req, res, next) => {
  // Validation check
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Dữ liệu không hợp lệ.', 400, errors.array()));
  }

  // File check
  if (!req.file) {
    return next(new AppError('Vui lòng tải lên một file video.', 400));
  }

  const { id: userId } = req.user;
  const { caption, music, tags, visibility } = req.body;

  // Validate video file
  const validation = await validateVideo(req.file.path);
  if (!validation.valid) {
    return next(
      new AppError(
        `Video không hợp lệ: ${validation.errors.join(', ')}`,
        400
      )
    );
  }

  // Log warnings nếu có
  if (validation.warnings.length > 0) {
    logger.warn(`Video warnings for user ${userId}:`, validation.warnings);
  }

  const reelData = { userId, caption, music, tags, visibility };

  try {
    const newReel = await ReelService.createReel(reelData, req.file);

    res.status(201).json({
      status: 'success',
      message: 'Reel đang được xử lý. Bạn sẽ nhận được thông báo khi hoàn tất.',
      data: {
        reel: newReel,
        estimatedProcessingTime: `${Math.ceil(validation.metadata.duration * 2)}s`, // Rough estimate
      },
    });
  } catch (error) {
    logger.error(`Error creating reel for user ${userId}:`, error);
    return next(new AppError(error.message || 'Không thể tạo Reel.', 500));
  }
});

/**
 * @desc Lấy danh sách Reels cho feed
 * @route GET /api/reels
 * @access Public (có thể không cần login)
 */
export const getReelFeed = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const userId = req.user ? req.user.id : null;

  try {
    const reels = await ReelService.getReelFeed(
      userId,
      parseInt(page, 10),
      parseInt(limit, 10)
    );

    res.status(200).json({
      status: 'success',
      results: reels.length,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      data: { reels },
    });
  } catch (error) {
    logger.error('Error getting reel feed:', error);
    return next(new AppError('Không thể lấy danh sách Reels.', 500));
  }
});

/**
 * @desc Lấy một Reel theo ID hoặc UUID
 * @route GET /api/reels/:identifier
 * @access Public
 */
export const getReelByIdentifier = asyncHandler(async (req, res, next) => {
  const { identifier } = req.params;
  const userId = req.user ? req.user.id : null;

  try {
    const reel = await ReelService.getReelByIdentifier(identifier, userId);

    // Increment view count (async, không block response)
    ReelService.incrementReelView(reel.id, userId).catch((err) => {
      logger.warn(`Failed to increment view for reel ${reel.id}:`, err);
    });

    res.status(200).json({
      status: 'success',
      data: { reel },
    });
  } catch (error) {
    logger.error(`Error getting reel ${identifier}:`, error);
    
    if (error.message.includes('not found')) {
      return next(new AppError('Reel không tồn tại.', 404));
    }
    
    if (error.message.includes('permission')) {
      return next(new AppError(error.message, 403));
    }

    return next(new AppError('Không thể lấy thông tin Reel.', 500));
  }
});

/**
 * @desc Lấy Reels của một user
 * @route GET /api/reels/user/:userId
 * @access Public
 */
export const getUserReels = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const currentUserId = req.user ? req.user.id : null;

  try {
    const reels = await ReelService.getUserReels(
      parseInt(userId, 10),
      currentUserId,
      parseInt(page, 10),
      parseInt(limit, 10)
    );

    res.status(200).json({
      status: 'success',
      results: reels.length,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      data: { reels },
    });
  } catch (error) {
    logger.error(`Error getting user reels for ${userId}:`, error);
    return next(new AppError('Không thể lấy danh sách Reels của người dùng.', 500));
  }
});

/**
 * @desc Cập nhật thông tin Reel
 * @route PUT /api/reels/:id
 * @access Private (chủ sở hữu)
 */
export const updateReel = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Dữ liệu không hợp lệ.', 400, errors.array()));
  }

  const { id: reelId } = req.params;
  const { id: userId } = req.user;
  const updateData = req.body;

  try {
    const updatedReel = await ReelService.updateReel(
      parseInt(reelId, 10),
      userId,
      updateData
    );

    res.status(200).json({
      status: 'success',
      message: 'Reel đã được cập nhật.',
      data: { reel: updatedReel },
    });
  } catch (error) {
    logger.error(`Error updating reel ${reelId}:`, error);

    if (error.message.includes('not found')) {
      return next(new AppError('Reel không tồn tại.', 404));
    }

    if (error.message.includes('permission')) {
      return next(new AppError(error.message, 403));
    }

    return next(new AppError('Không thể cập nhật Reel.', 500));
  }
});

/**
 * @desc Xóa Reel
 * @route DELETE /api/reels/:id
 * @access Private (chủ sở hữu)
 */
export const deleteReel = asyncHandler(async (req, res, next) => {
  const { id: reelId } = req.params;
  const { id: userId } = req.user;

  try {
    await ReelService.deleteReel(parseInt(reelId, 10), userId);

    res.status(204).json({
      status: 'success',
      message: 'Reel đã được xóa.',
      data: null,
    });
  } catch (error) {
    logger.error(`Error deleting reel ${reelId}:`, error);

    if (error.message.includes('not found')) {
      return next(new AppError('Reel không tồn tại.', 404));
    }

    if (error.message.includes('permission')) {
      return next(new AppError(error.message, 403));
    }

    return next(new AppError('Không thể xóa Reel.', 500));
  }
});

// ==================== INTERACTION OPERATIONS ====================

/**
 * @desc Like/Unlike Reel
 * @route POST /api/reels/:id/like
 * @access Private
 */
export const toggleLikeReel = asyncHandler(async (req, res, next) => {
  const { id: reelId } = req.params;
  const { id: userId } = req.user;

  try {
    const result = await ReelService.toggleLikeReel(
      parseInt(reelId, 10),
      userId
    );

    res.status(200).json({
      status: 'success',
      message: result.isLiked ? 'Đã thích Reel.' : 'Đã bỏ thích Reel.',
      data: result,
    });
  } catch (error) {
    logger.error(`Error toggling like for reel ${reelId}:`, error);

    if (error.message.includes('not found')) {
      return next(new AppError('Reel không tồn tại.', 404));
    }

    return next(new AppError('Không thể thực hiện thao tác.', 500));
  }
});

/**
 * @desc Thêm comment vào Reel
 * @route POST /api/reels/:id/comments
 * @access Private
 */
export const addReelComment = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Dữ liệu không hợp lệ.', 400, errors.array()));
  }

  const { id: reelId } = req.params;
  const { id: userId } = req.user;
  const { content, parentId } = req.body;

  try {
    const newComment = await ReelService.addReelComment(
      parseInt(reelId, 10),
      userId,
      content,
      parentId ? parseInt(parentId, 10) : null
    );

    res.status(201).json({
      status: 'success',
      message: 'Bình luận đã được thêm.',
      data: { comment: newComment },
    });
  } catch (error) {
    logger.error(`Error adding comment to reel ${reelId}:`, error);

    if (error.message.includes('not found')) {
      return next(new AppError('Reel không tồn tại.', 404));
    }

    if (error.message.includes('spam') || error.message.includes('wait')) {
      return next(new AppError(error.message, 429));
    }

    return next(new AppError(error.message || 'Không thể thêm bình luận.', 500));
  }
});

/**
 * @desc Lấy danh sách comments của Reel
 * @route GET /api/reels/:id/comments
 * @access Public
 */
export const getReelComments = asyncHandler(async (req, res, next) => {
  const { id: reelId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const comments = await ReelService.getReelComments(
      parseInt(reelId, 10),
      parseInt(page, 10),
      parseInt(limit, 10)
    );

    res.status(200).json({
      status: 'success',
      results: comments.length,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      data: { comments },
    });
  } catch (error) {
    logger.error(`Error getting comments for reel ${reelId}:`, error);
    return next(new AppError('Không thể lấy danh sách bình luận.', 500));
  }
});

// ==================== DISCOVERY OPERATIONS ====================

/**
 * @desc Lấy Reels trending
 * @route GET /api/reels/trending
 * @access Public
 */
export const getTrendingReels = asyncHandler(async (req, res, next) => {
  const { limit = 10 } = req.query;

  try {
    const reels = await ReelService.getTrendingReels(parseInt(limit, 10));

    res.status(200).json({
      status: 'success',
      results: reels.length,
      data: { reels },
    });
  } catch (error) {
    logger.error('Error getting trending reels:', error);
    return next(new AppError('Không thể lấy danh sách Reels trending.', 500));
  }
});

/**
 * @desc Lấy Reels tương tự
 * @route GET /api/reels/:id/similar
 * @access Public
 */
export const getSimilarReels = asyncHandler(async (req, res, next) => {
  const { id: currentReelId } = req.params;
  const { limit = 5 } = req.query;
  const userId = req.user ? req.user.id : null;

  try {
    const similarReels = await ReelService.getSimilarReels(
      userId,
      parseInt(currentReelId, 10),
      parseInt(limit, 10)
    );

    res.status(200).json({
      status: 'success',
      results: similarReels.length,
      data: { reels: similarReels },
    });
  } catch (error) {
    logger.error(`Error getting similar reels for ${currentReelId}:`, error);
    return next(new AppError('Không thể lấy danh sách Reels tương tự.', 500));
  }
});

// ==================== AI FEATURES ====================

/**
 * @desc AI: Gợi ý caption và hashtags
 * @route POST /api/reels/ai/suggest-caption
 * @access Private
 */
export const suggestAICaptionAndHashtags = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Dữ liệu không hợp lệ.', 400, errors.array()));
  }

  const { id: userId } = req.user;
  const { videoDescription } = req.body;

  if (!videoDescription || videoDescription.trim().length < 5) {
    return next(new AppError('Mô tả video phải có ít nhất 5 ký tự.', 400));
  }

  try {
    const aiSuggestion = await ReelService.getAICaptionAndHashtags(
      userId,
      videoDescription.trim()
    );

    res.status(200).json({
      status: 'success',
      message: 'AI đã tạo gợi ý thành công.',
      data: aiSuggestion,
    });
  } catch (error) {
    logger.error(`Error generating AI suggestions for user ${userId}:`, error);

    if (error.message.includes('Rate limit')) {
      return next(new AppError('Bạn đã sử dụng quá nhiều lần. Vui lòng thử lại sau.', 429));
    }

    return next(new AppError('Không thể tạo gợi ý AI.', 500));
  }
});

/**
 * @desc AI: Phân tích nội dung video
 * @route POST /api/reels/ai/analyze-content
 * @access Private
 */
export const analyzeReelContent = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Dữ liệu không hợp lệ.', 400, errors.array()));
  }

  const { id: userId } = req.user;
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return next(new AppError('URL video là bắt buộc.', 400));
  }

  try {
    const analysisResult = await ReelService.analyzeReelContent(userId, videoUrl);

    res.status(200).json({
      status: 'success',
      message: 'Phân tích video thành công.',
      data: analysisResult,
    });
  } catch (error) {
    logger.error(`Error analyzing video for user ${userId}:`, error);
    return next(new AppError('Không thể phân tích video.', 500));
  }
});

// ==================== ADMIN OPERATIONS ====================

/**
 * @desc Admin: Lấy tất cả Reels với filters
 * @route GET /api/reels/admin
 * @access Private (Admin/Editor)
 */
export const getAllReelsAdmin = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status, userId, caption, startDate, endDate } = req.query;
  
  const filters = {
    status,
    userId: userId ? parseInt(userId, 10) : undefined,
    caption,
    startDate,
    endDate,
  };

  try {
    const result = await ReelService.getAllReelsAdmin(
      filters,
      parseInt(page, 10),
      parseInt(limit, 10)
    );

    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (error) {
    logger.error('Admin error getting all reels:', error);
    return next(new AppError('Không thể lấy danh sách Reels.', 500));
  }
});

/**
 * @desc Admin: Cập nhật trạng thái Reel
 * @route PUT /api/reels/admin/:id/status
 * @access Private (Admin/Editor)
 */
export const updateReelStatusAdmin = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Dữ liệu không hợp lệ.', 400, errors.array()));
  }

  const { id: reelId } = req.params;
  const { status } = req.body;

  try {
    const updatedReel = await ReelService.updateReelStatusAdmin(
      parseInt(reelId, 10),
      status
    );

    res.status(200).json({
      status: 'success',
      message: 'Trạng thái Reel đã được cập nhật.',
      data: { reel: updatedReel },
    });
  } catch (error) {
    logger.error(`Admin error updating reel ${reelId} status:`, error);

    if (error.message.includes('not found')) {
      return next(new AppError('Reel không tồn tại.', 404));
    }

    if (error.message.includes('Invalid status')) {
      return next(new AppError(error.message, 400));
    }

    return next(new AppError('Không thể cập nhật trạng thái Reel.', 500));
  }
});

/**
 * @desc Admin: Xóa Reel
 * @route DELETE /api/reels/admin/:id
 * @access Private (Admin)
 */
export const deleteReelAdmin = asyncHandler(async (req, res, next) => {
  const { id: reelId } = req.params;

  try {
    await ReelService.deleteReelAdmin(parseInt(reelId, 10));

    res.status(204).json({
      status: 'success',
      message: 'Reel đã được xóa khỏi hệ thống.',
      data: null,
    });
  } catch (error) {
    logger.error(`Admin error deleting reel ${reelId}:`, error);

    if (error.message.includes('not found')) {
      return next(new AppError('Reel không tồn tại.', 404));
    }

    return next(new AppError('Không thể xóa Reel.', 500));
  }
});

// ==================== MONITORING & HEALTH ====================

/**
 * @desc Get Reel statistics (for dashboard)
 * @route GET /api/reels/stats
 * @access Private (Admin)
 */
export const getReelStats = asyncHandler(async (req, res, next) => {
  try {
    const { Reel } = require('../models/index.js').default;
    
    const [totalReels, pendingReels, processingReels, completedReels, failedReels] = await Promise.all([
      Reel.count(),
      Reel.count({ where: { status: 'pending' } }),
      Reel.count({ where: { status: 'processing' } }),
      Reel.count({ where: { status: 'completed' } }),
      Reel.count({ where: { status: 'failed' } }),
    ]);

    const stats = {
      total: totalReels,
      byStatus: {
        pending: pendingReels,
        processing: processingReels,
        completed: completedReels,
        failed: failedReels,
      },
      percentage: {
        completed: totalReels ? ((completedReels / totalReels) * 100).toFixed(2) : 0,
        failed: totalReels ? ((failedReels / totalReels) * 100).toFixed(2) : 0,
      },
    };

    res.status(200).json({
      status: 'success',
      data: { stats },
    });
  } catch (error) {
    logger.error('Error getting reel stats:', error);
    return next(new AppError('Không thể lấy thống kê Reels.', 500));
  }
});

export default {
  createReel,
  getReelFeed,
  getReelByIdentifier,
  getUserReels,
  updateReel,
  deleteReel,
  toggleLikeReel,
  addReelComment,
  getReelComments,
  getTrendingReels,
  getSimilarReels,
  suggestAICaptionAndHashtags,
  analyzeReelContent,
  getAllReelsAdmin,
  updateReelStatusAdmin,
  deleteReelAdmin,
  getReelStats,
};