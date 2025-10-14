import db from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { createNotification } from './notification.service.js';
import { generateNotificationContent } from '../utils/notification.utils.js';
import { getIo } from '../config/socket.js';
import { classifyCommentWithAI } from '../utils/ai.utils.js';

const { Comment, User, Movie, Episode, Role, sequelize } = db;

// ==================== CONSTANTS ====================

/**
 * Độ sâu tối đa cho hệ thống comment theo cấp bậc
 * 0: Bình luận gốc
 * 1: Trả lời bình luận gốc
 * 2: Trả lời của trả lời
 */
const MAX_COMMENT_DEPTH = 2;

/**
 * Cấu hình phân trang mặc định
 */
const DEFAULT_PAGINATION = {
    page: 1,
    limit: 10,
    sort: 'latest'
};

/**
 * Các loại sắp xếp được hỗ trợ
 */
const SORT_TYPES = {
    LATEST: 'latest',
    OLDEST: 'oldest',
    MOST_REPORTS: 'most_reports' // Thêm loại sắp xếp theo số lượt report
};

/**
 * Các loại nội dung được hỗ trợ
 */
const CONTENT_TYPES = {
    MOVIE: 'movie',
    EPISODE: 'episode'
};

/**
 * Các loại thông báo
 */
const NOTIFICATION_TYPES = {
    NEW_COMMENT: 'new_comment',
    LIKE_COMMENT: 'like_comment',
    COMMENT_REPORT: 'comment_report',
    USER_MENTION: 'user_mention'
};

// ==================== TRANSACTION HELPER FUNCTIONS ====================

/**
 * Thực hiện một transaction với retry logic
 * @param {Function} callback - Function chứa logic cần thực hiện trong transaction
 * @param {Object} options - Tùy chọn transaction
 * @returns {Promise<any>} Kết quả của callback
 */
const withTransaction = async (callback, options = {}) => {
    const defaultOptions = {
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        ...options
    };

    return await sequelize.transaction(defaultOptions, callback);
};

/**
 * Thực hiện transaction với rollback tự động khi có lỗi
 * @param {Function} callback - Function chứa logic cần thực hiện
 * @param {string} operation - Tên operation để logging
 * @returns {Promise<any>} Kết quả của callback
 */
const safeTransaction = async (callback, operation = 'Unknown') => {
    try {
        return await withTransaction(callback);
    } catch (error) {
        console.error(`Transaction failed for operation: ${operation}`, {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
};

/**
 * Thực hiện transaction với retry logic cho các lỗi có thể retry
 * @param {Function} callback - Function chứa logic cần thực hiện
 * @param {string} operation - Tên operation để logging
 * @param {number} maxRetries - Số lần retry tối đa (default: 3)
 * @returns {Promise<any>} Kết quả của callback
 */
const retryableTransaction = async (callback, operation = 'Unknown', maxRetries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await withTransaction(callback);
        } catch (error) {
            lastError = error;

            // Chỉ retry cho một số lỗi nhất định
            const retryableErrors = [
                'ER_LOCK_DEADLOCK',
                'ER_LOCK_WAIT_TIMEOUT',
                'ER_LOCK_TIMEOUT',
                'SequelizeTimeoutError',
                'SequelizeConnectionError'
            ];

            const shouldRetry = retryableErrors.some(errorType =>
                error.message.includes(errorType) || error.name === errorType
            );

            if (!shouldRetry || attempt === maxRetries) {
                console.error(`Transaction failed permanently for operation: ${operation}`, {
                    message: error.message,
                    stack: error.stack,
                    attempts: attempt,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }

            // Wait before retry (exponential backoff)
            const waitTime = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms
            console.warn(`Transaction failed for operation: ${operation}, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw lastError;
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Kiểm tra và chuyển đổi Sequelize instance thành plain object
 * @param {Object} obj - Object cần kiểm tra
 * @returns {Object} Plain object
 */
const toPlainObject = (obj) => {
    if (!obj) return {};
    if (typeof obj.toJSON === 'function') {
        return obj.toJSON();
    }
    if (typeof obj.get === 'function') {
        return obj.get({ plain: true });
    }
    return { ...obj };
};

/**
 * Xử lý mảng objects có thể là Sequelize instances
 * @param {Array} arr - Mảng cần xử lý
 * @returns {Array} Mảng plain objects
 */
const processArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => toPlainObject(item));
};

/**
 * Tạo cấu hình include cho User trong các query Sequelize
 * @returns {Object} Cấu hình include cho User với thông tin cơ bản và roles
 */
const createUserInclude = () => ({
    model: User,
    as: 'user',
    attributes: ['id', 'uuid', 'username', 'avatarUrl', 'sex'],
    include: [{
        model: Role,
        as: 'roles',
        attributes: ['name'],
        through: { attributes: [] }
    }]
});

/**
 * Tạo điều kiện where cơ bản cho việc lấy comments đã được duyệt và không bị ẩn
 * @param {Object} additionalConditions - Các điều kiện bổ sung
 * @returns {Object} Điều kiện where cho Sequelize
 */
const createBasicWhereCondition = (additionalConditions = {}) => ({
    isApproved: true,
    isHidden: false,
    ...additionalConditions
});

/**
 * Tạo điều kiện sắp xếp cho comments
 * @param {string} sortType - Loại sắp xếp ('latest' hoặc 'oldest' hoặc 'most_reports')
 * @returns {Array} Mảng điều kiện sắp xếp cho Sequelize
 */
const createOrderCondition = (sortType = SORT_TYPES.LATEST) => {
    if (sortType === SORT_TYPES.MOST_REPORTS) {
        return [[Sequelize.literal('JSON_LENGTH(reports)'), 'DESC'], ['createdAt', 'DESC']];
    }
    const direction = sortType === SORT_TYPES.OLDEST ? 'ASC' : 'DESC';
    return [['isPinned', 'DESC'], ['createdAt', direction]];
};

/**
 * Tạo subquery để đếm số lượng replies cho một comment
 * @returns {Array} Mảng literal Sequelize cho việc đếm replies
 */
const createRepliesCountSubquery = () => [
    Sequelize.literal(`(
        SELECT COUNT(*)
        FROM Comments AS ReplyCount
        WHERE
            ReplyCount.parentId = Comment.id AND
            ReplyCount.isApproved = true AND
            ReplyCount.isHidden = false
    )`),
    'repliesCount'
];

/**
 * Tạo subquery đếm replies với điều kiện depth (để tránh đếm sai cho nested replies)
 * @param {number} maxDepth - Độ sâu tối đa cần đếm
 * @returns {Array} Mảng literal Sequelize
 */
const createRepliesCountSubqueryWithDepth = (maxDepth = MAX_COMMENT_DEPTH) => [
    Sequelize.literal(`(
        SELECT COUNT(*)
        FROM Comments AS ReplyCount
        WHERE
            ReplyCount.parentId = Comment.id AND
            ReplyCount.isApproved = true AND
            ReplyCount.isHidden = false
    )`),
    'repliesCount'
];

/**
 * Tính toán độ sâu của một comment trong cây comment
 * @param {number} commentId - ID của comment cần tính độ sâu
 * @returns {Promise<number>} Độ sâu của comment
 */
const calculateCommentDepth = async (commentId) => {
    let depth = 0;
    let currentComment = await Comment.findByPk(commentId);

    // Duyệt ngược lên từ comment hiện tại đến comment gốc
    while (currentComment && currentComment.parentId) {
        depth++;
        currentComment = await Comment.findByPk(currentComment.parentId);

        // Tránh vòng lặp vô hạn trong trường hợp dữ liệu bị lỗi
        if (depth > MAX_COMMENT_DEPTH + 1) {
            break;
        }
    }

    return depth;
};

/**
 * Xác thực và chuẩn hóa tham số phân trang
 * @param {Object} queryParams - Các tham số query từ request
 * @returns {Object} Tham số phân trang đã được chuẩn hóa
 */
const normalizeQueryParams = (queryParams = {}) => {
    const {
        page = DEFAULT_PAGINATION.page,
        limit = DEFAULT_PAGINATION.limit,
        sort = DEFAULT_PAGINATION.sort,
        userId = null,
        minReports = 1, // Default to 1 for reported comments
        contentId = null,
        contentType = null,
        startDate = null,
        endDate = null,
        isApproved = null, // New filter
        isHidden = null,   // New filter
        isSpoiler = null,  // New filter
        isPinned = null,   // New filter
        isEdited = null    // New filter
    } = queryParams;

    return {
        page: Math.max(1, parseInt(page) || 1),
        limit: Math.max(1, Math.min(100, parseInt(limit) || 10)), // Giới hạn tối đa 100 items per page
        sort: Object.values(SORT_TYPES).includes(sort) ? sort : SORT_TYPES.LATEST,
        userId: userId ? parseInt(userId) : null,
        minReports: Math.max(0, parseInt(minReports) || 0),
        contentId: contentId ? parseInt(contentId) : null,
        contentType: Object.values(CONTENT_TYPES).includes(contentType) ? contentType : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isApproved: isApproved !== null ? (isApproved === 'true' || isApproved === true) : null,
        isHidden: isHidden !== null ? (isHidden === 'true' || isHidden === true) : null,
        isSpoiler: isSpoiler !== null ? (isSpoiler === 'true' || isSpoiler === true) : null,
        isPinned: isPinned !== null ? (isPinned === 'true' || isPinned === true) : null,
        isEdited: isEdited !== null ? (isEdited === 'true' || isEdited === true) : null,
    };
};

/**
 * Tính toán offset cho phân trang
 * @param {number} page - Số trang hiện tại
 * @param {number} limit - Số lượng items per page
 * @returns {number} Offset cho Sequelize query
 */
const calculateOffset = (page, limit) => (page - 1) * limit;

/**
 * Xử lý dữ liệu comment sau khi lấy từ database
 * @param {Object} comment - Comment object từ database
 * @param {number} userId - ID của user hiện tại (có thể null)
 * @param {number} currentDepth - Độ sâu hiện tại của comment (default: 0)
 * @returns {Object} Comment object đã được xử lý
 */
const processCommentData = (comment, userId = null, currentDepth = 0) => {
    // FIX: Sử dụng helper function để xử lý an toàn
    const commentData = toPlainObject(comment);

    // Đảm bảo replies cũng được xử lý đúng cách
    if (commentData.replies) {
        commentData.replies = processArray(commentData.replies);
    }

    // Thêm thông tin về trạng thái like/report của user hiện tại
    commentData.isLiked = userId ? (commentData.likes || []).includes(userId) : false;
    commentData.isReported = userId ? (commentData.reports || []).includes(userId) : false; // Thêm trạng thái report
    commentData.likesCount = (commentData.likes || []).length;
    commentData.reportsCount = (commentData.reports || []).length; // Thêm số lượt report

    // FIX: Tính toán repliesCount chính xác dựa trên độ sâu
    if (currentDepth >= MAX_COMMENT_DEPTH) {
        // Comment ở độ sâu tối đa không thể có replies
        commentData.repliesCount = 0;
        commentData.hasReplies = false;
    } else {
        // Đếm replies thực tế từ mảng replies được load
        const actualReplies = commentData.replies || [];
        const visibleReplies = actualReplies.filter(reply => 
            reply.isApproved !== false && reply.isHidden !== true
        );
        
        // Sử dụng số lượng thực tế thay vì subquery count
        commentData.repliesCount = visibleReplies.length;
        commentData.hasReplies = visibleReplies.length > 0;
    }

    // Thêm thông tin về độ sâu hiện tại
    commentData.depth = currentDepth;
    commentData.canReply = currentDepth < MAX_COMMENT_DEPTH;

    // Xóa thông tin nhạy cảm không cần thiết cho client
    delete commentData.likes;
    delete commentData.reports;

    return commentData;
};

/**
 * Xử lý replies của một comment với thông tin episode
 * @param {Array} replies - Mảng các replies
 * @param {number} userId - ID của user hiện tại
 * @param {Map} episodeMap - Map của episode IDs và episode numbers
 * @param {number} currentDepth - Độ sâu hiện tại (default: 1)
 * @returns {Promise<Array>} Mảng replies đã được xử lý
 */
const processRepliesWithEpisodeInfo = async (replies, userId, episodeMap, currentDepth = 1) => {
    if (!Array.isArray(replies) || replies.length === 0) return [];
    
    return Promise.all(replies.map(async (reply) => {
        const replyData = processCommentData(reply, userId, currentDepth);
        
        // Thêm episode info cho reply nếu cần
        if (replyData.contentType === CONTENT_TYPES.EPISODE) {
            const episodeNumber = episodeMap.get(replyData.contentId);
            if (episodeNumber !== undefined) {
                replyData.episodeNumber = episodeNumber;
                replyData.episodeTitle = `Tập ${episodeNumber}`;
            }
        }

        // Xử lý nested replies với độ sâu tăng lên
        if (replyData.replies && replyData.replies.length > 0 && currentDepth < MAX_COMMENT_DEPTH) {
            replyData.replies = await processRepliesWithEpisodeInfo(
                replyData.replies,
                userId,
                episodeMap,
                currentDepth + 1
            );
        } else if (currentDepth >= MAX_COMMENT_DEPTH) {
            // Đảm bảo không có replies ở độ sâu tối đa
            replyData.replies = [];
            replyData.repliesCount = 0;
            replyData.hasReplies = false;
        }

        return replyData;
    }));
};

/**
 * Xử lý replies của một comment (version cũ - giữ lại để tương thích)
 * @param {Array} replies - Mảng các replies
 * @param {number} userId - ID của user hiện tại
 * @param {number} contentId - ID của content (để lấy episode number nếu cần)
 * @param {string} contentType - Loại content
 * @param {number} currentDepth - Độ sâu hiện tại (default: 1)
 * @returns {Promise<Array>} Mảng replies đã được xử lý
 */
const processRepliesData = async (replies, userId, contentId, contentType, currentDepth = 1) => {
    if (!Array.isArray(replies) || replies.length === 0) return [];
    
    return Promise.all(replies.map(async (reply) => {
        const replyData = processCommentData(reply, userId, currentDepth);

        // Thêm episode number nếu cần thiết
        if (contentType === CONTENT_TYPES.EPISODE) {
            const episode = await Episode.findByPk(contentId, { attributes: ['episodeNumber'] });
            if (episode) {
                replyData.episodeNumber = episode.episodeNumber;
                replyData.episodeTitle = `Tập ${episode.episodeNumber}`;
            }
        }

        // Xử lý replies nếu có và chưa đạt độ sâu tối đa
        if (replyData.replies && replyData.replies.length > 0 && currentDepth < MAX_COMMENT_DEPTH) {
            replyData.replies = await processRepliesData(
                replyData.replies,
                userId,
                contentId,
                contentType,
                currentDepth + 1
            );
        } else if (currentDepth >= MAX_COMMENT_DEPTH) {
            // Đảm bảo không có replies ở độ sâu tối đa
            replyData.replies = [];
            replyData.repliesCount = 0;
            replyData.hasReplies = false;
        }

        return replyData;
    }));
};

/**
 * Tạo map của episode IDs và episode numbers
 * @param {number} movieId - ID của movie
 * @returns {Promise<Map>} Map với key là episode ID và value là episode number
 */
const createEpisodeMap = async (movieId) => {
    const episodes = await Episode.findAll({
        where: { movieId },
        attributes: ['id', 'episodeNumber']
    });

    return new Map(episodes.map(ep => [ep.id, ep.episodeNumber]));
};

/**
 * Tạo include array cho comments với nested replies
 */
const createCommentsIncludeArray = () => {
    return [
        createUserInclude(),
        {
            model: Comment,
            as: 'replies',
            where: { isHidden: false },
            required: false,
            include: [
                createUserInclude(),
                {
                    model: Comment,
                    as: 'replies',
                    where: { isHidden: false },
                    required: false,
                    include: [createUserInclude()],
                    attributes: {
                        include: [createRepliesCountSubquery()]
                    },
                }
            ],
            attributes: {
                include: [createRepliesCountSubquery()]
            },
        }
    ];
};

/**
 * Gửi thông báo cho tác giả comment gốc khi có reply mới
 * @param {Object} params - Tham số gửi thông báo
 * @param {number} params.parentCommentUserId - ID tác giả comment gốc
 * @param {number} params.currentUserId - ID người reply
 * @param {number} params.newCommentId - ID comment mới
 * @param {number} params.parentCommentId - ID comment gốc
 * @param {string} params.contentType - Loại content
 * @param {number} params.contentId - ID content
 * @param {string} params.commentText - Nội dung comment
 * @returns {Promise<void>}
 */
const sendReplyNotification = async ({
    parentCommentUserId,
    currentUserId,
    newCommentId,
    parentCommentId,
    contentType,
    contentId,
    commentText
}) => {
    // Chỉ gửi thông báo nếu người reply khác với tác giả comment gốc
    if (parentCommentUserId === currentUserId) {
        return;
    }

    const sender = await User.findByPk(currentUserId);
    if (!sender) {
        return;
    }

    // Build proper notification link based on content type
    let notificationLink = '';
    try {
        if (contentType === CONTENT_TYPES.MOVIE) {
            const movie = await Movie.findByPk(contentId, { attributes: ['slug'] });
            if (movie) {
                notificationLink = `/movie/${movie.slug}?commentId=${newCommentId}`;
            }
        } else if (contentType === CONTENT_TYPES.EPISODE) {
            const episode = await Episode.findByPk(contentId, {
                attributes: ['episodeNumber', 'movieId'],
                include: [{
                    model: Movie,
                    as: 'movie',
                    attributes: ['slug']
                }]
            });
            if (episode && episode.movie) {
                notificationLink = `/watch/${episode.movie.slug}/episode/${episode.episodeNumber}?commentId=${newCommentId}`;
            }
        }
    } catch (linkError) {
        console.error('Failed to build notification link:', linkError);
        // Fallback to basic link
        notificationLink = `/comments/${contentType}/${contentId}?commentId=${newCommentId}`;
    }

    const preview = commentText.length > 50 ? `${commentText.substring(0, 50)}...` : commentText;
    const { title, body } = generateNotificationContent('new_comment', {
        senderName: sender.username,
        commentPreview: preview,
    });

    await createNotification({
        userId: parentCommentUserId,
        type: NOTIFICATION_TYPES.NEW_COMMENT,
        title,
        body,
        link: notificationLink,
        senderId: currentUserId,
        metadata: {
            commentId: newCommentId,
            parentId: parentCommentId,
            contentId: contentId,
            contentType: contentType,
        }
    });
};

/**
 * Gửi thông báo like cho tác giả comment
 * @param {Object} params - Tham số gửi thông báo
 * @param {number} params.commentUserId - ID tác giả comment
 * @param {number} params.currentUserId - ID người like
 * @param {Object} params.comment - Comment object
 * @returns {Promise<void>}
 */
const sendLikeNotification = async ({ commentUserId, currentUserId, comment }) => {
    // Chỉ gửi thông báo nếu người like khác với tác giả comment
    if (commentUserId === currentUserId) {
        return;
    }

    const sender = await User.findByPk(currentUserId);
    if (!sender) {
        return;
    }

    // Build proper notification link based on content type
    let notificationLink = '';
    try {
        if (comment.contentType === CONTENT_TYPES.MOVIE) {
            const movie = await Movie.findByPk(comment.contentId, { attributes: ['slug'] });
            if (movie) {
                notificationLink = `/movie/${movie.slug}?commentId=${comment.id}`;
            }
        } else if (comment.contentType === CONTENT_TYPES.EPISODE) {
            const episode = await Episode.findByPk(comment.contentId, {
                attributes: ['episodeNumber', 'movieId'],
                include: [{
                    model: Movie,
                    as: 'movie',
                    attributes: ['slug']
                }]
            });
            if (episode && episode.movie) {
                notificationLink = `/watch/${episode.movie.slug}/episode/${episode.episodeNumber}?commentId=${comment.id}`;
            }
        }
    } catch (linkError) {
        console.error('Failed to build notification link:', linkError);
        // Fallback to basic link
        notificationLink = `/comments/${comment.contentType}/${comment.contentId}?commentId=${comment.id}`;
    }

    const preview = comment.text.length > 50 ? `${comment.text.substring(0, 50)}...` : comment.text;
    const { title, body } = generateNotificationContent('like_comment', {
        senderName: sender.username,
        commentPreview: preview,
    });

    await createNotification({
        userId: commentUserId,
        type: NOTIFICATION_TYPES.LIKE_COMMENT,
        title,
        body,
        link: notificationLink,
        senderId: currentUserId,
        metadata: {
            commentId: comment.id,
            contentId: comment.contentId,
            contentType: comment.contentType,
        }
    });
};

/**
 * Gửi thông báo report cho tất cả admin
 * @param {Object} params - Tham số gửi thông báo
 * @param {number} params.reporterId - ID người report
 * @param {Object} params.comment - Comment object bị report
 * @returns {Promise<void>}
 */
const sendReportNotification = async ({ reporterId, comment }) => {
    const admins = await User.findAll({
        include: [{
            model: Role, // FIX: Sử dụng Role thay vì db.Role
            as: 'roles',
            where: { name: 'admin' },
            through: { attributes: [] }
        }]
    });

    if (admins.length === 0) {
        return;
    }

    const sender = await User.findByPk(reporterId);
    if (!sender) {
        return;
    }

    const preview = comment.text.length > 50 ? `${comment.text.substring(0, 50)}...` : comment.text;
    const { title, body } = generateNotificationContent('comment_report', {
        senderName: sender.username,
        commentPreview: preview,
    });
    const notificationLink = `/admin/comments/${comment.id}`;

    // Gửi thông báo đến tất cả admin
    const notificationPromises = admins.map(admin =>
        createNotification({
            userId: admin.id,
            type: NOTIFICATION_TYPES.COMMENT_REPORT,
            title,
            body,
            link: notificationLink,
            senderId: reporterId,
            metadata: {
                commentId: comment.id,
                contentId: comment.contentId,
                contentType: comment.contentType,
            }
        })
    );

    await Promise.all(notificationPromises);
};

/**
 * Gửi thông báo mention cho người dùng được nhắc đến trong bình luận.
 * @param {Object} params - Tham số gửi thông báo.
 * @param {string} params.commentText - Nội dung đầy đủ của bình luận.
 * @param {number} params.senderId - ID của người tạo bình luận.
 * @param {number} params.commentId - ID của bình luận mới.
 * @param {string} params.contentType - Loại nội dung (movie/episode).
 * @param {number} params.contentId - ID của nội dung.
 * @returns {Promise<void>}
 */
const sendMentionNotifications = async ({ commentText, senderId, commentId, contentType, contentId }) => {
    console.log("Debug sendMentionNotifications: ", commentText, senderId, commentId, contentType, contentId);
    
    // Regex cải tiến để tìm tất cả các mention link trong nội dung bình luận
    // Hỗ trợ tên có dấu cách, ký tự Unicode (tiếng Việt), và các ký tự đặc biệt
    const mentionRegex = /\[@([^\]]+)\]\(\/profile\/([a-f0-9-]+)\)/g;
    let match;
    const mentionedUserUuids = new Set();

    while ((match = mentionRegex.exec(commentText)) !== null) {
        mentionedUserUuids.add(match[2]); // Lấy UUID từ nhóm thứ hai của regex (vì giờ có 2 nhóm capture)
    }

    console.log("Debug mentionedUserUuids: ", mentionedUserUuids);

    if (mentionedUserUuids.size === 0) {
        return; // Không có mention nào để xử lý
    }

    // Lấy thông tin người gửi để tạo thông báo
    const sender = await User.findByPk(senderId, { attributes: ['id', 'username'] });
    if (!sender) {
        console.error(`sendMentionNotifications: Không tìm thấy người gửi với ID ${senderId}`);
        return;
    }
    console.log("Debug sender: ", sender);
    // Chuyển đổi UUID thành User ID và lọc bỏ người gửi
    const mentionedUsers = await User.findAll({
        where: {
            uuid: { [Op.in]: Array.from(mentionedUserUuids) },
            id: { [Op.ne]: senderId } // Không gửi thông báo cho chính người mention
        },
        attributes: ['id', 'username']
    });

    if (mentionedUsers.length === 0) {
        return; // Không có người dùng hợp lệ nào để gửi thông báo
    }
    console.log("Debug mentionedUsers: ", mentionedUsers);
    // Helper: strip markdown profile links to @username for notification display
    const stripMentionLinksForNotification = (text) => {
        if (!text) return '';
        // Regex cải tiến để hỗ trợ tên có dấu cách và ký tự Unicode
        return text.replace(/\[@([^\]]+)\]\(\/profile\/[a-f0-9-]+\)/gi, '@$1');
    };
    console.log("Debug: ", stripMentionLinksForNotification(commentText));

    const cleanedCommentText = stripMentionLinksForNotification(commentText);
    const preview = cleanedCommentText.length > 50 ? `${cleanedCommentText.substring(0, 50)}...` : cleanedCommentText;
    
    // Build proper notification link based on content type
    let notificationLink = '';
    try {
        if (contentType === CONTENT_TYPES.MOVIE) {
            const movie = await Movie.findByPk(contentId, { attributes: ['slug'] });
            if (movie) {
                notificationLink = `/movie/${movie.slug}?commentId=${commentId}`;
            }
        } else if (contentType === CONTENT_TYPES.EPISODE) {
            const episode = await Episode.findByPk(contentId, {
                attributes: ['episodeNumber', 'movieId'],
                include: [{
                    model: Movie,
                    as: 'movie',
                    attributes: ['slug']
                }]
            });
            if (episode && episode.movie) {
                notificationLink = `/watch/${episode.movie.slug}/episode/${episode.episodeNumber}?commentId=${commentId}`;
            }
        }
    } catch (linkError) {
        console.error('Failed to build notification link:', linkError);
        // Fallback to basic link
        notificationLink = `/comments/${contentType}/${contentId}?commentId=${commentId}`;
    }

    const notificationPromises = mentionedUsers.map(async (user) => {
        const { title, body } = generateNotificationContent(NOTIFICATION_TYPES.USER_MENTION, {
            senderName: sender.username,
            commentPreview: preview,
        });
        console.log("Debug: ", title, body);

        return createNotification({
            userId: user.id,
            type: NOTIFICATION_TYPES.USER_MENTION,
            title,
            body,
            link: notificationLink,
            senderId: senderId,
            metadata: {
                commentId: commentId,
                contentId: contentId,
                contentType: contentType,
                mentionedUserId: user.id,
            }
        });
    });

    await Promise.all(notificationPromises);
};

/**
 * Lọc bỏ các mention [@username](/profile/:uuid) khỏi nội dung bình luận.
 * Chỉ giữ lại phần text phía sau hoặc các phần text không phải mention.
 * @param {string} text - Nội dung bình luận gốc.
 * @returns {string} Nội dung bình luận đã được lọc.
 */
const stripMentions = (text) => {
    if (!text) return '';
    // Regex để tìm các mention có định dạng [@username](/profile/:uuid)
    // và thay thế chúng bằng "@username"
    // Ví dụ: "Hello [@User Name](/profile/uuid) this is a comment." -> "Hello @User Name this is a comment."
    return text.replace(/\[@([^\]]+)\]\(\/profile\/[a-f0-9-]+\)/g, '@$1').trim();
};


// ==================== CORE SERVICE FUNCTIONS ====================

/**
 * Tạo bình luận mới
 * @param {number} userId - ID người dùng tạo bình luận
 * @param {Object} commentData - Dữ liệu bình luận
 * @param {number} commentData.contentId - ID của nội dung được bình luận
 * @param {string} commentData.contentType - Loại nội dung ('movie' hoặc 'episode')
 * @param {number} commentData.parentId - ID bình luận cha (nếu là reply)
 * @param {string} commentData.text - Nội dung bình luận
 * @param {boolean} commentData.isSpoiler - Có phải là spoiler hay không
 * @returns {Promise<Object>} Bình luận đã tạo với thông tin user
 * @throws {Error} Khi có lỗi xảy ra trong quá trình tạo
 */
const createComment = async (userId, commentData) => {
    return await retryableTransaction(async (transaction) => {
        const { contentId, contentType, parentId, text, isSpoiler = false } = commentData;

        // Validate loại nội dung
        if (!Object.values(CONTENT_TYPES).includes(contentType)) {
            throw new Error('Loại nội dung không hợp lệ. Chỉ chấp nhận "movie" hoặc "episode".');
        }

        // Kiểm tra độ sâu comment nếu là reply
        let parentComment = null;
        if (parentId) {
            parentComment = await Comment.findByPk(parentId, { transaction });
            if (!parentComment) {
                throw new Error('Bình luận cha không tồn tại.');
            }

            const currentDepth = await calculateCommentDepth(parentId);
            if (currentDepth >= MAX_COMMENT_DEPTH) {
                throw new Error(`Không thể trả lời bình luận này. Độ sâu tối đa cho phép là ${MAX_COMMENT_DEPTH}.`);
            }
        }

        // Tạo comment mới trong transaction
        const newComment = await Comment.create({
            userId,
            contentId: parseInt(contentId),
            contentType,
            parentId: parentId ? parseInt(parentId) : null,
            text: text.trim(),
            isSpoiler: Boolean(isSpoiler),
            isApproved: true,
            likes: [],
            reports: []
        }, { transaction });

        // Lấy comment đã tạo cùng với thông tin user trong transaction
        const createdCommentWithUser = await Comment.findByPk(newComment.id, {
            include: [createUserInclude()],
            transaction
        });

        console.log("Debug createdCommentWithUser: ", createdCommentWithUser);

        // Gửi thông báo cho tác giả comment cha nếu đây là reply
        if (parentId && parentComment) {
            try {
                await sendReplyNotification({
                    parentCommentUserId: parentComment.userId,
                    currentUserId: userId,
                    newCommentId: newComment.id,
                    parentCommentId: parentId,
                    contentType,
                    contentId,
                    commentText: text
                });
            } catch (notificationError) {
                // Log lỗi notification nhưng không rollback transaction vì comment đã được tạo thành công
                console.error('Failed to send reply notification:', notificationError);
            }
        }

        console.log("Debug parentId: ", parentId);
        console.log("Debug parentComment: ", parentComment);

        // Gửi thông báo mention cho người dùng được nhắc đến
        try {
            await sendMentionNotifications({
                commentText: text,
                senderId: userId,
                commentId: newComment.id,
                contentType,
                contentId,
            });
        } catch (mentionNotificationError) {
            console.error('Failed to send mention notifications:', mentionNotificationError);
        }

        // Emit socket event for real-time updates
        try {
            const io = getIo();
            if (io) {
                const commentData = processCommentData(createdCommentWithUser, userId);
                io.emit('comment_created', {
                    comment: commentData,
                    contentType,
                    contentId,
                    parentId
                });
            }
        } catch (socketError) {
            console.error('Failed to emit comment_created event:', socketError);
        }

        return createdCommentWithUser;
    }, 'createComment');
};

/**
 * Lấy danh sách bình luận theo phim/tập
 * @param {string} contentType - Loại nội dung ('movie' hoặc 'episode')
 * @param {number} contentId - ID của nội dung
 * @param {Object} query - Đối tượng query (page, limit, sort, userId)
 * @returns {Promise<Object>} Danh sách bình luận và thông tin phân trang
 * @throws {Error} Khi loại nội dung không hợp lệ
 */
const getComments = async (contentType, contentId, query = {}) => {
    try {
        // Validate loại nội dung
        if (!Object.values(CONTENT_TYPES).includes(contentType)) {
            throw new Error('Loại nội dung không hợp lệ. Chỉ chấp nhận "movie" hoặc "episode".');
        }

        // Validate contentId
        const parsedContentId = parseInt(contentId);
        if (!contentId || isNaN(parsedContentId) || parsedContentId <= 0) {
            throw new Error('ID nội dung không hợp lệ.');
        }

        const { page, limit, sort, userId } = normalizeQueryParams(query);
        const offset = calculateOffset(page, limit);

        // Kiểm tra content tồn tại trước khi query comments
        if (contentType === CONTENT_TYPES.EPISODE) {
            const episode = await Episode.findByPk(parsedContentId, { attributes: ['id'] });
            if (!episode) {
                throw new Error('Tập phim không tồn tại.');
            }
        } else if (contentType === CONTENT_TYPES.MOVIE) {
            const movie = await Movie.findByPk(parsedContentId, { attributes: ['id'] });
            if (!movie) {
                throw new Error('Phim không tồn tại.');
            }
        }

        // Lấy comments gốc (parentId = null) với thông tin user và replies
        const whereCondition = createBasicWhereCondition({
            contentType,
            contentId: parsedContentId,
            parentId: null
        });

        // Sử dụng transaction để đảm bảo tính nhất quán
        const result = await sequelize.transaction(async (t) => {
            // 1. Đếm tổng số bình luận gốc (root comments) một cách chính xác
            const totalRootComments = await Comment.count({
                where: whereCondition,
                transaction: t
            });

            // Early return nếu không có comments (trong transaction)
            if (totalRootComments === 0) {
                return { rows: [], totalRootComments: 0 };
            }

            // 2. Lấy danh sách bình luận gốc đã phân trang
            const rows = await Comment.findAll({
                where: whereCondition,
                include: [
                    createUserInclude(),
                    {
                        model: Comment,
                        as: 'replies',
                        where: { isHidden: false, isApproved: true },
                        required: false,
                        include: [createUserInclude()],
                        attributes: {
                            include: [createRepliesCountSubquery()]
                        },
                    }
                ],
                attributes: {
                    include: [createRepliesCountSubquery()]
                },
                order: createOrderCondition(sort),
                limit,
                offset,
                transaction: t
            });

            return { rows, totalRootComments };
        });

        // Early return nếu không có comments
        if (result.totalRootComments === 0) {
            return {
                data: [],
                meta: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            };
        }

        // Cache episode info nếu cần (tránh N+1 query)
        let episodeInfo = null;
        if (contentType === CONTENT_TYPES.EPISODE) {
            try {
                const episode = await Episode.findByPk(parsedContentId, { attributes: ['episodeNumber'] });
                if (episode) {
                    episodeInfo = {
                        episodeNumber: episode.episodeNumber,
                        episodeTitle: `Tập ${episode.episodeNumber}`
                    };
                }
            } catch (episodeError) {
                console.error('Failed to fetch episode info:', episodeError);
                // Không throw error, chỉ log và tiếp tục
            }
        }

        // Xử lý dữ liệu comments
        const processedComments = await Promise.all(result.rows.map(async (comment) => {
            const commentData = processCommentData(comment, userId, 0); // Depth 0 for root comments

            // Thêm episode number nếu là episode và có thông tin
            if (contentType === CONTENT_TYPES.EPISODE && episodeInfo) {
                commentData.episodeNumber = episodeInfo.episodeNumber;
                commentData.episodeTitle = episodeInfo.episodeTitle;
            }

            // Xử lý replies nếu có
            if (commentData.replies && commentData.replies.length > 0) {
                try {
                    commentData.replies = await processRepliesData(
                        commentData.replies,
                        userId,
                        parsedContentId,
                        contentType,
                        1 // Start replies at depth 1
                    );
                } catch (replyError) {
                    console.error('Failed to process replies:', replyError);
                    commentData.replies = []; // Fallback to empty array
                }
            }

            return commentData;
        }));
            
        return {
            data: processedComments,
            meta: {
                page,
                limit,
                total: result.totalRootComments,
                totalPages: Math.ceil(result.totalRootComments / limit)
            }
        };
    } catch (error) {
        console.error('Error in getComments:', {
            contentType,
            contentId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Lấy các bình luận trả lời cho một bình luận cha
 * @param {number} parentId - ID của bình luận cha
 * @param {Object} query - Đối tượng query (page, limit, sort, userId)
 * @returns {Promise<Object>} Danh sách bình luận trả lời và thông tin phân trang
 */
const getReplies = async (parentId, query = {}) => {
    try {
        // Validate parentId
        const parsedParentId = parseInt(parentId);
        if (!parentId || isNaN(parsedParentId) || parsedParentId <= 0) {
            throw new Error('ID bình luận cha không hợp lệ.');
        }

        const { page, limit, sort, userId } = normalizeQueryParams(query);
        const offset = calculateOffset(page, limit);

        // Kiểm tra parent comment tồn tại và hợp lệ
        const parentComment = await Comment.findByPk(parsedParentId, {
            attributes: ['id', 'parentId', 'contentId', 'contentType', 'isApproved', 'isHidden']
        });
        
        if (!parentComment) {
            throw new Error('Bình luận cha không tồn tại.');
        }

        // Kiểm tra parent comment có bị ẩn hoặc chưa được duyệt
        if (parentComment.isHidden || !parentComment.isApproved) {
            throw new Error('Bình luận cha không khả dụng.');
        }

        // Tính depth của parent comment để đảm bảo không vượt quá MAX_COMMENT_DEPTH
        const parentDepth = await calculateCommentDepth(parsedParentId);
        if (parentDepth >= MAX_COMMENT_DEPTH) {
            // Parent đã ở độ sâu tối đa, không có replies
            return {
                data: [],
                meta: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            };
        }

        const whereCondition = createBasicWhereCondition({
            parentId: parsedParentId
        });
        
        // Sử dụng transaction để đảm bảo tính nhất quán
        const result = await sequelize.transaction(async (t) => {
            const totalReplies = await Comment.count({
                where: whereCondition,
                transaction: t
            });

            // Early return nếu không có replies
            if (totalReplies === 0) {
                return { rows: [], totalReplies: 0 };
            }

            // Lấy replies của parent comment
            const rows = await Comment.findAll({
                where: whereCondition,
                include: [
                    createUserInclude(),
                    {
                        model: Comment,
                        as: 'replies',
                        where: { isHidden: false, isApproved: true },
                        required: false,
                        include: [createUserInclude()],
                        attributes: {
                            include: [createRepliesCountSubquery()]
                        },
                    }
                ],
                attributes: {
                    include: [createRepliesCountSubquery()]
                },
                order: createOrderCondition(sort),
                limit,
                offset,
                transaction: t
            });

            return { rows, totalReplies };
        });

        // Early return nếu không có replies
        if (result.totalReplies === 0) {
            return {
                data: [],
                meta: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            };
        }

        // Cache episode info nếu cần (tránh N+1 query)
        const episodeCache = new Map();

        // Xử lý dữ liệu replies với depth tracking
        const processedReplies = await Promise.all(result.rows.map(async (reply) => {
            const currentDepth = parentDepth + 1;
            const replyData = processCommentData(reply, userId, currentDepth);
            
            // Thêm episode number nếu là episode comment
            if (replyData.contentType === CONTENT_TYPES.EPISODE) {
                try {
                    // Kiểm tra cache trước
                    if (!episodeCache.has(replyData.contentId)) {
                        const episode = await Episode.findByPk(replyData.contentId, { attributes: ['episodeNumber'] });
                        if (episode) {
                            episodeCache.set(replyData.contentId, {
                                episodeNumber: episode.episodeNumber,
                                episodeTitle: `Tập ${episode.episodeNumber}`
                            });
                        }
                    }
                    
                    const episodeInfo = episodeCache.get(replyData.contentId);
                    if (episodeInfo) {
                        replyData.episodeNumber = episodeInfo.episodeNumber;
                        replyData.episodeTitle = episodeInfo.episodeTitle;
                    }
                } catch (episodeError) {
                    console.error('Failed to fetch episode info for reply:', episodeError);
                    // Không throw error, chỉ log và tiếp tục
                }
            }

            // Đảm bảo không load nested replies nếu đã đạt max depth
            if (currentDepth >= MAX_COMMENT_DEPTH) {
                replyData.replies = [];
                replyData.repliesCount = 0;
                replyData.hasReplies = false;
            } else {
                // Giữ replies từ query nhưng đảm bảo chúng được xử lý đúng
                replyData.replies = [];
            }

            return replyData;
        }));

        return {
            data: processedReplies,
            meta: {
                page,
                limit,
                total: result.totalReplies,
                totalPages: Math.ceil(result.totalReplies / limit)
            }
        };
    } catch (error) {
        console.error('Error in getReplies:', {
            parentId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Lấy bình luận theo phim + tập (merge)
 * @param {number} movieId - ID của phim
 * @param {Object} query - Đối tượng query (page, limit, sort, userId)
 * @returns {Promise<Object>} Danh sách bình luận đã merge và thông tin phân trang
 */
const getCommentsForMovieWithEpisodes = async (movieId, query = {}) => {
    try {
        // Validate movieId
        const parsedMovieId = parseInt(movieId);
        if (!movieId || isNaN(parsedMovieId) || parsedMovieId <= 0) {
            throw new Error('ID phim không hợp lệ.');
        }

        const { page, limit, sort, userId } = normalizeQueryParams(query);
        const offset = calculateOffset(page, limit);

        // Kiểm tra movie tồn tại
        const movie = await Movie.findByPk(parsedMovieId, { attributes: ['id'] });
        if (!movie) {
            throw new Error('Phim không tồn tại.');
        }

        // Tạo map episode ID -> episode number với error handling
        let episodeMap;
        let episodeIds = [];
        
        try {
            episodeMap = await createEpisodeMap(parsedMovieId);
            episodeIds = Array.from(episodeMap.keys());
        } catch (episodeError) {
            console.error('Failed to create episode map:', episodeError);
            // Fallback: chỉ lấy comments của movie
            episodeMap = new Map();
            episodeIds = [];
        }

        // Early return nếu không có episodes - chỉ lấy comments của movie
        if (episodeIds.length === 0) {
            return await getComments(CONTENT_TYPES.MOVIE, parsedMovieId, query);
        }

        // Giới hạn số lượng episodes để tránh query quá lớn
        const MAX_EPISODES_PER_QUERY = 1000;
        if (episodeIds.length > MAX_EPISODES_PER_QUERY) {
            console.warn(`Movie ${parsedMovieId} has ${episodeIds.length} episodes, limiting to ${MAX_EPISODES_PER_QUERY}`);
            episodeIds = episodeIds.slice(0, MAX_EPISODES_PER_QUERY);
        }

        // Tạo điều kiện where cho movie và episodes
        const whereCondition = createBasicWhereCondition({
            [Op.or]: [
                { contentType: CONTENT_TYPES.MOVIE, contentId: parsedMovieId },
                { contentType: CONTENT_TYPES.EPISODE, contentId: { [Op.in]: episodeIds } }
            ],
            parentId: null // Chỉ lấy comments gốc
        });

        // Sử dụng transaction để đảm bảo tính nhất quán
        const result = await sequelize.transaction(async (t) => {
            // 1. Đếm tổng số bình luận gốc (root comments) một cách chính xác
            const totalRootComments = await Comment.count({
                where: whereCondition,
                transaction: t
            });

            // Early return nếu không có comments (trong transaction)
            if (totalRootComments === 0) {
                return { rows: [], totalRootComments: 0 };
            }

            // 2. Lấy danh sách bình luận gốc đã phân trang
            const rows = await Comment.findAll({
                where: whereCondition,
                include: [
                    createUserInclude(),
                    {
                        model: Comment,
                        as: 'replies',
                        where: { isHidden: false, isApproved: true },
                        required: false,
                        include: [createUserInclude()],
                        attributes: {
                            include: [createRepliesCountSubquery()]
                        },
                    }
                ],
                attributes: {
                    include: [createRepliesCountSubquery()]
                },
                order: createOrderCondition(sort),
                limit,
                offset,
                transaction: t
            });

            return { rows, totalRootComments };
        });

        // Early return nếu không có comments
        if (result.totalRootComments === 0) {
            return {
                data: [],
                meta: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            };
        }

        // Xử lý dữ liệu comments với thông tin episode
        const processedComments = await Promise.all(result.rows.map(async (comment) => {
            const commentData = processCommentData(comment, userId, 0); // Depth 0 for root comments

            // Thêm episode number nếu là episode comment
            if (commentData.contentType === CONTENT_TYPES.EPISODE) {
                const episodeNumber = episodeMap.get(commentData.contentId);
                if (episodeNumber !== undefined) {
                    commentData.episodeNumber = episodeNumber;
                    commentData.episodeTitle = `Tập ${episodeNumber}`;
                } else {
                    // Fallback: log warning nếu không tìm thấy episode trong map
                    console.warn(`Episode ${commentData.contentId} not found in episode map for movie ${parsedMovieId}`);
                }
            }

            // Xóa replies để tránh load dữ liệu không cần thiết
            commentData.replies = [];

            return commentData;
        }));

        return {
            data: processedComments,
            meta: {
                page,
                limit,
                total: result.totalRootComments,
                totalPages: Math.ceil(result.totalRootComments / limit)
            }
        };
    } catch (error) {
        console.error('Error in getCommentsForMovieWithEpisodes:', {
            movieId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Cập nhật bình luận
 * @param {number} commentId - ID bình luận cần cập nhật
 * @param {number} userId - ID người dùng yêu cầu cập nhật
 * @param {Object} updateData - Dữ liệu cập nhật
 * @param {string} updateData.text - Nội dung mới
 * @param {boolean} updateData.isSpoiler - Trạng thái spoiler mới
 * @returns {Promise<Object>} Bình luận đã cập nhật
 * @throws {Error} Khi comment không tồn tại hoặc user không có quyền
 */
const updateComment = async (commentId, userId, updateData) => {
    return await retryableTransaction(async (transaction) => {
        const comment = await Comment.findByPk(commentId, {
            lock: Sequelize.Transaction.LOCK.UPDATE,
            transaction
        });

        if (!comment) {
            throw new Error('Bình luận không tồn tại.');
        }

        if (comment.userId !== userId) {
            throw new Error('Bạn không có quyền chỉnh sửa bình luận này.');
        }

        // Chuẩn bị dữ liệu cập nhật
        const updateFields = {
            isEdited: true
        };

        if (updateData.text !== undefined) {
            updateFields.text = updateData.text.trim();
        }

        if (updateData.isSpoiler !== undefined) {
            updateFields.isSpoiler = Boolean(updateData.isSpoiler);
        }

        // Thực hiện cập nhật trong transaction
        await comment.update(updateFields, { transaction });

        // Lấy comment đã cập nhật với thông tin user
        const updatedComment = await Comment.findByPk(comment.id, {
            include: [createUserInclude()],
            transaction
        });

        // Emit socket event for real-time updates
        try {
            const io = getIo();
            if (io) {
                const commentData = processCommentData(updatedComment, userId);
                io.emit('comment_updated', {
                    comment: commentData,
                    contentType: comment.contentType,
                    contentId: comment.contentId,
                    parentId: comment.parentId
                });
            }
        } catch (socketError) {
            console.error('Failed to emit comment_updated event:', socketError);
        }

        return updatedComment;
    }, 'updateComment');
};

/**
 * Xóa bình luận
 * @param {number} commentId - ID bình luận cần xóa
 * @param {number} userId - ID người dùng yêu cầu xóa
 * @returns {Promise<void>}
 * @throws {Error} Khi comment không tồn tại hoặc user không có quyền
 */
const deleteComment = async (commentId, userId) => {
    return await retryableTransaction(async (transaction) => {
        const comment = await Comment.findByPk(commentId, {
            lock: Sequelize.Transaction.LOCK.UPDATE,
            transaction
        });

        if (!comment) {
            throw new Error('Bình luận không tồn tại.');
        }

        if (comment.userId !== userId) {
            throw new Error('Bạn không có quyền xóa bình luận này.');
        }

        // Lưu thông tin comment trước khi xóa để emit socket event
        const commentInfo = {
            id: comment.id,
            contentType: comment.contentType,
            contentId: comment.contentId,
            parentId: comment.parentId
        };

        // Xóa comment và tất cả replies trong transaction
        // Cascade sẽ xóa các replies tự động
        await comment.destroy({ transaction });

        // Emit socket event for real-time updates
        try {
            const io = getIo();
            if (io) {
                io.emit('comment_deleted', {
                    commentId: commentInfo.id,
                    contentType: commentInfo.contentType,
                    contentId: commentInfo.contentId,
                    parentId: commentInfo.parentId
                });
            }
        } catch (socketError) {
            console.error('Failed to emit comment_deleted event:', socketError);
        }
    }, 'deleteComment');
};

/**
 * Like/Unlike bình luận
 * @param {number} commentId - ID bình luận
 * @param {number} userId - ID người dùng thực hiện like/unlike
 * @returns {Promise<Object>} Bình luận đã cập nhật
 * @throws {Error} Khi comment không tồn tại
 */
const likeComment = async (commentId, userId) => {
    return await retryableTransaction(async (transaction) => {
        const comment = await Comment.findByPk(commentId, {
            lock: Sequelize.Transaction.LOCK.UPDATE,
            transaction
        });

        if (!comment) {
            throw new Error('Bình luận không tồn tại.');
        }

        let likes = Array.isArray(comment.likes) ? [...comment.likes] : [];
        const userIndex = likes.indexOf(userId);
        let shouldSendNotification = false;

        if (userIndex === -1) {
            // Thực hiện like
            likes.push(userId);
            shouldSendNotification = true;
        } else {
            // Thực hiện unlike
            likes.splice(userIndex, 1);
        }

        // Cập nhật likes trong transaction
        await comment.update({ likes }, { transaction });

        // Gửi thông báo cho tác giả comment (ngoài transaction để tránh rollback)
        if (shouldSendNotification) {
            try {
                await sendLikeNotification({
                    commentUserId: comment.userId,
                    currentUserId: userId,
                    comment
                });
            } catch (notificationError) {
                // Log lỗi notification nhưng không rollback transaction vì like đã thành công
                console.error('Failed to send like notification:', notificationError);
            }
        }

        // Lấy comment đã cập nhật với thông tin user
        const updatedComment = await Comment.findByPk(comment.id, {
            include: [createUserInclude()],
            transaction
        });
        const commentData = processCommentData(updatedComment, userId)

        // Emit socket event for real-time updates
        try {
            const io = getIo();
            if (io) {
                io.emit('comment_liked', {
                    comment: commentData,
                    contentType: comment.contentType,
                    contentId: comment.contentId,
                    parentId: comment.parentId,
                    isLiked: userIndex === -1, // true if liked, false if unliked
                    likesCount: likes.length
                });
            }
        } catch (socketError) {
            console.error('Failed to emit comment_liked event:', socketError);
        }

        return commentData;
    }, 'likeComment');
};

/**
 * Report bình luận
 * @param {number} commentId - ID bình luận
 * @param {number} userId - ID người dùng thực hiện report
 * @returns {Promise<Object>} Bình luận đã cập nhật
 * @throws {Error} Khi comment không tồn tại
 */
const reportComment = async (commentId, userId) => {
    return await safeTransaction(async (transaction) => {
        const comment = await Comment.findByPk(commentId, {
            lock: Sequelize.Transaction.LOCK.UPDATE,
            transaction
        });

        if (!comment) {
            throw new Error('Bình luận không tồn tại.');
        }

        let reports = Array.isArray(comment.reports) ? [...comment.reports] : [];
        const userIndex = reports.indexOf(userId);
        let shouldSendNotification = false;

        if (userIndex === -1) {
            // Thực hiện report
            reports.push(userId);
            shouldSendNotification = true;
        } else {
            // Hủy report (nếu cho phép)
            reports.splice(userIndex, 1);
        }

        // Cập nhật reports trong transaction
        await comment.update({ reports }, { transaction });

        // Gửi thông báo cho admin (ngoài transaction để tránh rollback)
        if (shouldSendNotification) {
            try {
                await sendReportNotification({
                    reporterId: userId,
                    comment
                });
            } catch (notificationError) {
                // Log lỗi notification nhưng không rollback transaction vì report đã thành công
                console.error('Failed to send report notification:', notificationError);
            }
        }

        // Trả về comment đã cập nhật với thông tin user
        return Comment.findByPk(comment.id, {
            include: [createUserInclude()],
            transaction
        });
    }, 'reportComment');
};

// ==================== ADMIN SERVICE FUNCTIONS ====================

/**
 * Lấy danh sách bình luận bị báo cáo (Admin only)
 * @param {Object} filters - Các bộ lọc và phân trang
 * @param {number} filters.page - Số trang
 * @param {number} filters.limit - Số lượng item mỗi trang
 * @param {string} filters.sort - Kiểu sắp xếp ('latest', 'oldest', 'most_reports')
 * @param {number} filters.minReports - Số lượt báo cáo tối thiểu
 * @param {number} filters.userId - Lọc theo ID người dùng
 * @param {number} filters.contentId - Lọc theo ID nội dung
 * @param {string} filters.contentType - Lọc theo loại nội dung
 * @param {string} filters.startDate - Lọc theo ngày bắt đầu
 * @param {string} filters.endDate - Lọc theo ngày kết thúc
 * @returns {Promise<Object>} Danh sách bình luận bị báo cáo và thông tin phân trang
 */
const getReportedComments = async (filters = {}) => {
    const {
        page,
        limit,
        sort,
        minReports,
        userId,
        contentId,
        contentType,
        startDate,
        endDate,
        isApproved,
        isHidden,
        isSpoiler,
        isPinned,
        isEdited
    } = normalizeQueryParams(filters);
    const offset = calculateOffset(page, limit);

    const whereConditions = [];

    // Filter by minimum reports
    whereConditions.push(Sequelize.literal(`JSON_LENGTH(reports) >= ${minReports}`));

    // Add other filters if they exist
    if (userId !== null) {
        whereConditions.push({ userId });
    }
    if (contentId !== null) {
        whereConditions.push({ contentId });
    }
    if (contentType !== null) {
        whereConditions.push({ contentType });
    }
    if (startDate && endDate) {
        whereConditions.push({
            createdAt: {
                [Op.between]: [startDate, endDate]
            }
        });
    } else if (startDate) {
        whereConditions.push({
            createdAt: {
                [Op.gte]: startDate
            }
        });
    } else if (endDate) {
        whereConditions.push({
            createdAt: {
                [Op.lte]: endDate
            }
        });
    }

    // Add new boolean filters
    if (isApproved !== null) {
        whereConditions.push({ isApproved });
    }
    if (isHidden !== null) {
        whereConditions.push({ isHidden });
    }
    if (isSpoiler !== null) {
        whereConditions.push({ isSpoiler });
    }
    if (isPinned !== null) {
        whereConditions.push({ isPinned });
    }
    if (isEdited !== null) {
        whereConditions.push({ isEdited });
    }

    const whereCondition = {
        [Op.and]: whereConditions
    };

    const { count, rows } = await Comment.findAndCountAll({
        where: whereCondition,
        include: [createUserInclude()],
        attributes: {
            include: [
                [Sequelize.literal('JSON_LENGTH(reports)'), 'reportsCount'],
                createRepliesCountSubquery()
            ]
        },
        order: createOrderCondition(sort),
        limit,
        offset
    });

    const processedComments = await Promise.all(rows.map(async (comment) => {
        const commentData = processCommentData(comment, null, 0); // Admin view, no specific userId for like/report status
        
        // Thêm episode number nếu là episode
        if (commentData.contentType === CONTENT_TYPES.EPISODE) {
            const episode = await Episode.findByPk(commentData.contentId, { attributes: ['episodeNumber'] });
            if (episode) {
                commentData.episodeNumber = episode.episodeNumber;
                commentData.episodeTitle = `Tập ${episode.episodeNumber}`;
            }
        }
        return commentData;
    }));

    return {
        data: processedComments,
        meta: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit)
        }
    };
};

/**
 * Lấy thống kê bình luận cho Admin
 * @param {Object} filters - Các bộ lọc
 * @param {string} filters.startDate - Ngày bắt đầu
 * @param {string} filters.endDate - Ngày kết thúc
 * @param {string} filters.contentType - Loại nội dung
 * @param {number} filters.contentId - ID nội dung
 * @param {number} filters.userId - ID người dùng
 * @returns {Promise<Object>} Dữ liệu thống kê
 */
const getCommentStatsAdmin = async (filters = {}) => {
    const {
        startDate,
        endDate,
        contentType,
        contentId,
        userId,
        minReports,
        isApproved,
        isHidden,
        isSpoiler,
        isPinned,
        isEdited
    } = normalizeQueryParams(filters);

    const baseWhereConditions = [];

    if (userId !== null) {
        baseWhereConditions.push({ userId });
    }
    if (contentId !== null) {
        baseWhereConditions.push({ contentId });
    }
    if (contentType !== null) {
        baseWhereConditions.push({ contentType });
    }
    if (startDate && endDate) {
        baseWhereConditions.push({
            createdAt: {
                [Op.between]: [startDate, endDate]
            }
        });
    } else if (startDate) {
        baseWhereConditions.push({
            createdAt: {
                [Op.gte]: startDate
            }
        });
    } else if (endDate) {
        baseWhereConditions.push({
            createdAt: {
                [Op.lte]: endDate
            }
        });
    }

    // Add new boolean filters to base conditions
    if (isApproved !== null) {
        baseWhereConditions.push({ isApproved });
    }
    if (isHidden !== null) {
        baseWhereConditions.push({ isHidden });
    }
    if (isSpoiler !== null) {
        baseWhereConditions.push({ isSpoiler });
    }
    if (isPinned !== null) {
        baseWhereConditions.push({ isPinned });
    }
    if (isEdited !== null) {
        baseWhereConditions.push({ isEdited });
    }

    const baseWhereCondition = {
        [Op.and]: baseWhereConditions
    };

    // Tổng số bình luận
    const totalComments = await Comment.count({ where: baseWhereCondition });

    // Bình luận được duyệt/ẩn
    const approvedComments = await Comment.count({
        where: {
            ...baseWhereCondition,
            isApproved: true
        }
    });
    const hiddenComments = await Comment.count({
        where: {
            ...baseWhereCondition,
            isHidden: true
        }
    });

    // Bình luận bị báo cáo (sử dụng minReports từ normalizeQueryParams)
    const reportedCommentsCount = await Comment.count({
        where: {
            [Op.and]: [
                ...baseWhereConditions,
                Sequelize.literal(`JSON_LENGTH(reports) >= ${minReports}`)
            ]
        }
    });

    // Bình luận theo thời gian (ví dụ: theo ngày)
    const commentsByDate = await Comment.findAll({
        attributes: [
            [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: baseWhereCondition,
        group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
        order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']]
    });

    // Top users bình luận
    const topUsers = await Comment.findAll({
        attributes: [
            'userId',
            [Sequelize.fn('COUNT', Sequelize.col('Comment.id')), 'commentCount']
        ],
        where: baseWhereCondition,
        include: [{
            model: User,
            as: 'user',
            attributes: ['username', 'avatarUrl']
        }],
        group: ['userId', 'user.username', 'user.avatarUrl'],
        order: [[Sequelize.literal('commentCount'), 'DESC']],
        limit: 5
    });

    // Top content được bình luận
    const topContent = await Comment.findAll({
        attributes: [
            'contentType',
            'contentId',
            [Sequelize.fn('COUNT', Sequelize.col('Comment.id')), 'commentCount']
        ],
        where: baseWhereCondition,
        group: ['contentType', 'contentId'],
        order: [[Sequelize.literal('commentCount'), 'DESC']],
        limit: 5
    });

    // Lấy tất cả bình luận phù hợp với bộ lọc để phân tích
    const commentsForAnalysis = await Comment.findAll({
        where: baseWhereCondition,
        attributes: ['text'],
        raw: true, // Lấy dữ liệu thuần túy để tăng tốc độ
    });

    // Phân tích cảm xúc (sentiment analysis)
    const sentimentStats = {
        positive: 0,
        negative: 0,
        neutral: 0,
        toxic: 0,
        spam: 0,
        hateSpeech: 0,
    };

    if (commentsForAnalysis.length > 0) {
        // Thực hiện phân tích song song để tăng hiệu suất
        const analysisPromises = commentsForAnalysis.map(comment => {
            const cleanedText = stripMentions(comment.text);
            return classifyCommentWithAI(cleanedText);
        });
        const analysisResults = await Promise.all(analysisPromises);

        analysisResults.forEach(result => {
            if (result.classification) {
                // Chuẩn hóa classification key (ví dụ: "hate_speech" -> "hateSpeech")
                const formattedClassification = result.classification.replace(/_([a-z])/g, g => g[1].toUpperCase());
                if (sentimentStats.hasOwnProperty(formattedClassification)) {
                    sentimentStats[formattedClassification]++;
                }
            }
        });
    }

    return {
        totalComments,
        approvedComments,
        hiddenComments,
        reportedCommentsCount,
        commentsByDate: commentsByDate.map(item => toPlainObject(item)),
        topUsers: topUsers.map(item => toPlainObject(item)),
        topContent: topContent.map(item => toPlainObject(item)),
        sentimentStats
    };
};

/**
 * Duyệt bình luận (Admin only)
 * @param {number} commentId - ID bình luận cần duyệt
 * @param {boolean} isApproved - Trạng thái duyệt (true: duyệt, false: không duyệt)
 * @returns {Promise<Object>} Bình luận đã cập nhật
 * @throws {Error} Khi comment không tồn tại
 */
const approveComment = async (commentId, isApproved) => {
    return await safeTransaction(async (transaction) => {
        const comment = await Comment.findByPk(commentId, {
            lock: Sequelize.Transaction.LOCK.UPDATE,
            transaction
        });

        if (!comment) {
            throw new Error('Bình luận không tồn tại.');
        }

        // Cập nhật trạng thái duyệt trong transaction
        await comment.update({
            isApproved: Boolean(isApproved)
        }, { transaction });

        // Trả về comment đã cập nhật với thông tin user
        return Comment.findByPk(comment.id, {
            include: [createUserInclude()],
            transaction
        });
    }, 'approveComment');
};

/**
 * Ghim bình luận (Admin only)
 * @param {number} commentId - ID bình luận cần ghim
 * @param {boolean} isPinned - Trạng thái ghim (true: ghim, false: bỏ ghim)
 * @returns {Promise<Object>} Bình luận đã cập nhật
 * @throws {Error} Khi comment không tồn tại
 */
const pinComment = async (commentId, isPinned) => {
    return await safeTransaction(async (transaction) => {
        const comment = await Comment.findByPk(commentId, {
            lock: Sequelize.Transaction.LOCK.UPDATE,
            transaction
        });

        if (!comment) {
            throw new Error('Bình luận không tồn tại.');
        }

        // Chỉ cho phép ghim comment gốc (không phải reply)
        if (isPinned && comment.parentId) {
            throw new Error('Chỉ có thể ghim bình luận gốc, không thể ghim reply.');
        }

        // Cập nhật trạng thái ghim trong transaction
        await comment.update({
            isPinned: Boolean(isPinned)
        }, { transaction });

        // Trả về comment đã cập nhật với thông tin user
        return Comment.findByPk(comment.id, {
            include: [createUserInclude()],
            transaction
        });
    }, 'pinComment');
};

/**
 * Ẩn bình luận (Admin only)
 * @param {number} commentId - ID bình luận cần ẩn
 * @param {boolean} isHidden - Trạng thái ẩn (true: ẩn, false: hiển thị)
 * @returns {Promise<Object>} Bình luận đã cập nhật
 * @throws {Error} Khi comment không tồn tại
 */
const hideComment = async (commentId, isHidden) => {
    return await safeTransaction(async (transaction) => {
        const comment = await Comment.findByPk(commentId, {
            lock: Sequelize.Transaction.LOCK.UPDATE,
            transaction
        });

        if (!comment) {
            throw new Error('Bình luận không tồn tại.');
        }

        // Cập nhật trạng thái ẩn trong transaction
        await comment.update({
            isHidden: Boolean(isHidden)
        }, { transaction });

        // Trả về comment đã cập nhật với thông tin user
        return Comment.findByPk(comment.id, {
            include: [createUserInclude()],
            transaction
        });
    }, 'hideComment');
};

/**
 * Xóa bình luận với quyền admin
 * @param {number} commentId - ID bình luận cần xóa
 * @returns {Promise<void>}
 * @throws {Error} Khi comment không tồn tại
 */
const adminDeleteComment = async (commentId) => {
    return await retryableTransaction(async (transaction) => {
        const comment = await Comment.findByPk(commentId, {
            lock: Sequelize.Transaction.LOCK.UPDATE,
            transaction
        });

        if (!comment) {
            throw new Error('Bình luận không tồn tại.');
        }

        // Admin có thể xóa bất kỳ comment nào
        // Cascade sẽ tự động xóa các replies trong transaction
        await comment.destroy({ transaction });
    }, 'adminDeleteComment');
};

// ==================== UTILITY FUNCTIONS (for external use) ====================

/**
 * Kiểm tra xem một comment có thể được reply hay không
 * @param {number} commentId - ID của comment cần kiểm tra
 * @returns {Promise<Object>} Kết quả kiểm tra với thông tin chi tiết
 */
const canReplyToComment = async (commentId) => {
    const comment = await Comment.findByPk(commentId);

    if (!comment) {
        return {
            canReply: false,
            reason: 'Bình luận không tồn tại.'
        };
    }

    if (!comment.isApproved) {
        return {
            canReply: false,
            reason: 'Bình luận chưa được duyệt.'
        };
    }

    if (comment.isHidden) {
        return {
            canReply: false,
            reason: 'Bình luận đã bị ẩn.'
        };
    }

    const currentDepth = await calculateCommentDepth(commentId);
    if (currentDepth >= MAX_COMMENT_DEPTH) {
        return {
            canReply: false,
            reason: `Đã đạt độ sâu tối đa cho phép (${MAX_COMMENT_DEPTH}).`
        };
    }

    return {
        canReply: true,
        currentDepth,
        maxDepth: MAX_COMMENT_DEPTH
    };
};

/**
 * Lấy thống kê comment cho một content
 * @param {string} contentType - Loại nội dung
 * @param {number} contentId - ID nội dung
 * @returns {Promise<Object>} Thống kê comment
 */
const getCommentStats = async (contentType, contentId) => {
    const whereCondition = {
        contentType,
        contentId: parseInt(contentId)
    };

    // Đếm tổng số comments (bao gồm replies)
    const totalComments = await Comment.count({
        where: {
            ...whereCondition,
            isApproved: true,
            isHidden: false
        }
    });

    // Đếm số comments gốc
    const rootComments = await Comment.count({
        where: {
            ...whereCondition,
            parentId: null,
            isApproved: true,
            isHidden: false
        }
    });

    // Đếm số replies
    const totalReplies = totalComments - rootComments;

    // Lấy comment mới nhất
    const latestComment = await Comment.findOne({
        where: {
            ...whereCondition,
            isApproved: true,
            isHidden: false
        },
        include: [createUserInclude()],
        order: [['createdAt', 'DESC']]
    });

    return {
        totalComments,
        rootComments,
        totalReplies,
        latestComment: latestComment ? processCommentData(latestComment) : null
    };
};

/**
 * Tìm kiếm comments theo keyword
 * @param {Object} params - Tham số tìm kiếm
 * @param {string} params.keyword - Từ khóa tìm kiếm
 * @param {string} params.contentType - Loại nội dung (optional)
 * @param {number} params.contentId - ID nội dung (optional)
 * @param {number} params.userId - ID user hiện tại (optional)
 * @param {Object} params.pagination - Thông tin phân trang
 * @returns {Promise<Object>} Kết quả tìm kiếm
 */
const searchComments = async (params) => {
    const {
        keyword,
        contentType,
        contentId,
        userId,
        pagination = {}
    } = params;

    if (!keyword || keyword.trim().length === 0) {
        throw new Error('Từ khóa tìm kiếm không được để trống.');
    }

    const { page, limit, sort } = normalizeQueryParams(pagination);
    const offset = calculateOffset(page, limit);

    // Tạo điều kiện where
    const whereCondition = createBasicWhereCondition({
        text: {
            [Op.like]: `%${keyword.trim()}%`
        }
    });

    // Thêm filter theo content nếu có
    if (contentType) {
        whereCondition.contentType = contentType;
    }
    if (contentId) {
        whereCondition.contentId = parseInt(contentId);
    }

    // Thực hiện tìm kiếm
    const { count, rows } = await Comment.findAndCountAll({
        where: whereCondition,
        include: [
            createUserInclude(),
            {
                model: Comment,
                as: 'replies',
                where: { isHidden: false },
                required: false
            }
        ],
        attributes: {
            include: [createRepliesCountSubquery()]
        },
        order: createOrderCondition(sort),
        limit,
        offset
    });

    // Xử lý kết quả
    const processedResults = await Promise.all(rows.map(async (comment) => {
        const commentData = processCommentData(comment, userId);

        // Highlight keyword trong text (simple highlight)
        if (commentData.text) {
            const regex = new RegExp(`(${keyword.trim()})`, 'gi');
            commentData.highlightedText = commentData.text.replace(regex, '<mark>$1</mark>');
        }

        // Thêm thông tin content nếu cần
        if (commentData.contentType === CONTENT_TYPES.EPISODE) {
            const episode = await Episode.findByPk(commentData.contentId, {
                attributes: ['episodeNumber', 'movieId'],
                include: [{
                    model: Movie,
                    attributes: ['title']
                }]
            });
            if (episode) {
                commentData.episodeInfo = {
                    episodeNumber: episode.episodeNumber,
                    movieTitle: episode.Movie?.title
                };
            }
        }

        return commentData;
    }));

    return {
        data: processedResults,
        meta: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
            keyword: keyword.trim()
        }
    };
};

/**
 * Lấy comment cụ thể và parent chain của nó
 * @param {number} commentId - ID của comment
 * @param {number} userId - ID user hiện tại (optional)
 * @returns {Promise<Object>} Comment và parent IDs
 */
const getCommentWithParents = async (commentId, userId = null) => {
    try {
        const comment = await Comment.findByPk(commentId, {
            include: [createUserInclude()]
        });

        if (!comment) {
            throw new Error('Comment không tồn tại.');
        }

        // Build parent chain
        const parentChain = [];
        let currentComment = comment;
        
        while (currentComment.parentId) {
            parentChain.unshift(currentComment.parentId);
            currentComment = await Comment.findByPk(currentComment.parentId);
            if (!currentComment) break;
        }

        return {
            comment: processCommentData(comment, userId),
            parentChain, // Array of parent IDs from root to direct parent
            depth: parentChain.length
        };
    } catch (error) {
        console.error('Error in getCommentWithParents:', error);
        throw error;
    }
};

// ==================== EXPORTS ====================

export {
    // Core functions
    createComment,
    getComments,
    getReplies,
    getCommentsForMovieWithEpisodes,
    updateComment,
    deleteComment,
    likeComment,
    reportComment,

    // Admin functions
    getReportedComments,
    getCommentStatsAdmin,
    approveComment,
    pinComment,
    hideComment,
    adminDeleteComment,

    // Utility functions
    canReplyToComment,
    getCommentStats,
    searchComments,
    getCommentWithParents,

    withTransaction,
    safeTransaction,
    retryableTransaction,

    // Constants
    MAX_COMMENT_DEPTH,
    CONTENT_TYPES,
    SORT_TYPES,
    NOTIFICATION_TYPES
};
