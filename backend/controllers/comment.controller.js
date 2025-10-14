import asyncHandler from 'express-async-handler';
import * as commentService from '../services/comment.service.js';

/**
 * @desc    Tạo bình luận mới
 * @route   POST /api/comments
 * @access  Private
 */
const createComment = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { contentId, contentType, parentId, text, isSpoiler } = req.body;

    if (!contentId || !contentType || !text) {
        res.status(400);
        throw new Error('Vui lòng cung cấp đầy đủ contentId, contentType và nội dung bình luận.');
    }

    if (!['movie', 'episode'].includes(contentType)) {
        res.status(400);
        throw new Error('Loại nội dung không hợp lệ. Chỉ chấp nhận "movie" hoặc "episode".');
    }

    const newComment = await commentService.createComment(userId, {
        contentId,
        contentType,
        parentId,
        text,
        isSpoiler,
    });

    res.status(201).json({
        success: true,
        data: newComment,
        message: 'Bình luận đã được tạo thành công.',
    });
});

/**
 * @desc    Lấy danh sách bình luận theo phim/tập
 * @route   GET /api/comments/:contentType/:contentId
 * @access  Public
 */
const getComments = asyncHandler(async (req, res) => {
    const { contentType, contentId } = req.params;
    const { page, limit, sort } = req.query;
    const userId = req.user ? req.user.id : null; // User ID is optional for public access

    if (!['movie', 'episode'].includes(contentType)) {
        res.status(400);
        throw new Error('Loại nội dung không hợp lệ. Chỉ chấp nhận "movie" hoặc "episode".');
    }

    const result = await commentService.getComments(contentType, parseInt(contentId), { page, limit, sort, userId });

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
    });
});

/**
 * @desc    Lấy các bình luận trả lời cho một bình luận cha
 * @route   GET /api/comments/:parentId/replies
 * @access  Public
 */
const getReplies = asyncHandler(async (req, res) => {
    const { parentId } = req.params;
    const { page, limit, sort } = req.query;
    const userId = req.user ? req.user.id : null;

    const result = await commentService.getReplies(parseInt(parentId), { page, limit, sort, userId });

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
    });
});

/**
 * @desc    Lấy bình luận theo phim + tập (merge)
 * @route   GET /api/comments/movie/:movieId/with-episodes
 * @access  Public
 */
const getCommentsForMovieWithEpisodes = asyncHandler(async (req, res) => {
    const { movieId } = req.params;
    const { page, limit, sort } = req.query;
    const userId = req.user ? req.user.id : null;

    const result = await commentService.getCommentsForMovieWithEpisodes(parseInt(movieId), { page, limit, sort, userId });

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
    });
});

/**
 * @desc    Cập nhật bình luận
 * @route   PUT /api/comments/:id
 * @access  Private
 */
const updateComment = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { text, isSpoiler } = req.body;

    if (!text && isSpoiler === undefined) {
        res.status(400);
        throw new Error('Vui lòng cung cấp nội dung hoặc trạng thái spoiler để cập nhật.');
    }

    const updatedComment = await commentService.updateComment(parseInt(id), userId, { text, isSpoiler });

    res.status(200).json({
        success: true,
        data: updatedComment,
        message: 'Bình luận đã được cập nhật thành công.',
    });
});

/**
 * @desc    Xóa bình luận
 * @route   DELETE /api/comments/:id
 * @access  Private
 */
const deleteComment = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    await commentService.deleteComment(parseInt(id), userId);

    res.status(200).json({
        success: true,
        message: 'Bình luận đã được xóa thành công.',
    });
});

/**
 * @desc    Like/Unlike bình luận
 * @route   POST /api/comments/:id/like
 * @access  Private
 */
const likeComment = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const updatedComment = await commentService.likeComment(parseInt(id), userId);

    res.status(200).json({
        success: true,
        data: updatedComment,
        message: 'Thao tác like/unlike thành công.',
    });
});

/**
 * @desc    Report bình luận
 * @route   POST /api/comments/:id/report
 * @access  Private
 */
const reportComment = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const updatedComment = await commentService.reportComment(parseInt(id), userId);

    res.status(200).json({
        success: true,
        data: updatedComment,
        message: 'Thao tác report thành công.',
    });
});

// Admin APIs

/**
 * @desc    Lấy danh sách bình luận bị báo cáo (Admin)
 * @route   GET /api/comments/admin/reported
 * @access  Private/Admin
 */
const getReportedComments = asyncHandler(async (req, res) => {
    const { page, limit, sort, minReports, userId, contentId, contentType, startDate, endDate } = req.query;

    const result = await commentService.getReportedComments({
        page,
        limit,
        sort,
        minReports: parseInt(minReports),
        userId: userId ? parseInt(userId) : undefined,
        contentId: contentId ? parseInt(contentId) : undefined,
        contentType,
        startDate,
        endDate
    });

    res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
    });
});

/**
 * @desc    Lấy thống kê bình luận cho Admin
 * @route   GET /api/comments/admin/stats
 * @access  Private/Admin
 */
const getCommentStatsAdmin = asyncHandler(async (req, res) => {
    const { startDate, endDate, contentType, contentId, userId } = req.query;

    const stats = await commentService.getCommentStatsAdmin({
        startDate,
        endDate,
        contentType,
        contentId: contentId ? parseInt(contentId) : undefined,
        userId: userId ? parseInt(userId) : undefined,
    });

    res.status(200).json({
        success: true,
        data: stats,
        message: 'Lấy thống kê bình luận thành công.',
    });
});

/**
 * @desc    Duyệt bình luận (Admin)
 * @route   PUT /api/comments/:id/approve
 * @access  Private/Admin
 */
const approveComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isApproved } = req.body;

    if (isApproved === undefined || typeof isApproved !== 'boolean') {
        res.status(400);
        throw new Error('Vui lòng cung cấp trạng thái duyệt hợp lệ (true/false).');
    }

    const updatedComment = await commentService.approveComment(parseInt(id), isApproved);

    res.status(200).json({
        success: true,
        data: updatedComment,
        message: `Bình luận đã được ${isApproved ? 'duyệt' : 'bỏ duyệt'} thành công.`,
    });
});

/**
 * @desc    Ghim bình luận (Admin)
 * @route   PUT /api/comments/:id/pin
 * @access  Private/Admin
 */
const pinComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isPinned } = req.body;

    if (isPinned === undefined || typeof isPinned !== 'boolean') {
        res.status(400);
        throw new Error('Vui lòng cung cấp trạng thái ghim hợp lệ (true/false).');
    }

    const updatedComment = await commentService.pinComment(parseInt(id), isPinned);

    res.status(200).json({
        success: true,
        data: updatedComment,
        message: `Bình luận đã được ${isPinned ? 'ghim' : 'bỏ ghim'} thành công.`,
    });
});

/**
 * @desc    Ẩn bình luận (Admin)
 * @route   PUT /api/comments/:id/hide
 * @access  Private/Admin
 */
const hideComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isHidden } = req.body;

    if (isHidden === undefined || typeof isHidden !== 'boolean') {
        res.status(400);
        throw new Error('Vui lòng cung cấp trạng thái ẩn hợp lệ (true/false).');
    }

    const updatedComment = await commentService.hideComment(parseInt(id), isHidden);

    res.status(200).json({
        success: true,
        data: updatedComment,
        message: `Bình luận đã được ${isHidden ? 'ẩn' : 'hiển thị'} thành công.`,
    });
});

/**
 * @desc    Xóa bình luận (Admin)
 * @route   DELETE /api/comments/:id/admin
 * @access  Private/Admin
 */
const adminDeleteComment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await commentService.adminDeleteComment(parseInt(id));

    res.status(200).json({
        success: true,
        message: 'Bình luận đã được xóa bởi admin thành công.',
    });
});

/**
 * @desc    Lấy comment cụ thể và parent chain
 * @route   GET /api/comments/:id/with-parents
 * @access  Public
 */
const getCommentWithParents = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const result = await commentService.getCommentWithParents(parseInt(id), userId);

    res.status(200).json({
        success: true,
        data: result,
    });
});

export {
    createComment,
    getComments,
    getReplies,
    getCommentsForMovieWithEpisodes,
    updateComment,
    deleteComment,
    likeComment,
    reportComment,
    getReportedComments, // Export new admin function
    getCommentStatsAdmin, // Export new admin function
    approveComment,
    pinComment,
    hideComment,
    adminDeleteComment,
    getCommentWithParents,
};
