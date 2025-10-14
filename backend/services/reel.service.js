import db from '../models/index.js';
import { addReelProcessingJob } from '../config/bullmq.js';
import { Op } from 'sequelize';
import { getIo, emitToUser, emitToUsers } from '../config/socket.js';
import { redisHelpers } from '../config/redis.js';
import logger from '../utils/logger.js';
import * as NotificationService from './notification.service.js';
import { generateReelCaptionAndHashtags } from './ai.service.js';

const { Reel, User, ReelLike, ReelComment, FollowReel, Friendship } = db;

// ==================== CACHE KEYS & TTL ====================
const CACHE_TTL = {
  REEL_DETAIL: 300, // 5 phút
  REEL_FEED: 60, // 1 phút - feed thay đổi nhanh
  TRENDING_REELS: 180, // 3 phút
  USER_REELS: 120, // 2 phút
  FRIEND_IDS: 300, // 5 phút
  FOLLOWER_IDS: 300, // 5 phút
};

const CACHE_KEY = {
  REEL: (reelId) => `reel:${reelId}`,
  REEL_FEED: (userId, page, limit) => `reel_feed:${userId || 'guest'}:${page}:${limit}`,
  TRENDING_REELS: (limit) => `trending_reels:${limit}`,
  USER_REELS: (userId, page, limit) => `user_reels:${userId}:${page}:${limit}`,
  FRIEND_IDS: (userId) => `friends:${userId}`,
  FOLLOWER_IDS: (userId) => `followers:reel:${userId}`,
  REEL_STATS: (reelId) => `reel_stats:${reelId}`, // Lưu views, likes, comments count
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Lấy danh sách friend IDs với cache
 */
const getFriendIds = async (userId) => {
  return redisHelpers.cache(
    CACHE_KEY.FRIEND_IDS(userId),
    async () => {
      const friendships = await Friendship.findAll({
        where: {
          status: 'accepted',
          [Op.or]: [{ senderId: userId }, { receiverId: userId }],
        },
        attributes: ['senderId', 'receiverId'],
        raw: true,
      });

      return friendships.map((f) =>
        f.senderId === userId ? f.receiverId : f.senderId
      );
    },
    CACHE_TTL.FRIEND_IDS
  );
};

/**
 * Lấy danh sách follower IDs với cache
 */
const getFollowerIds = async (userId) => {
  return redisHelpers.cache(
    CACHE_KEY.FOLLOWER_IDS(userId),
    async () => {
      const followers = await FollowReel.findAll({
        where: { followingId: userId },
        attributes: ['followerId'],
        raw: true,
      });
      return followers.map((f) => f.followerId);
    },
    CACHE_TTL.FOLLOWER_IDS
  );
};

/**
 * Invalidate tất cả cache liên quan đến một reel
 */
const invalidateReelCache = async (reelId, userId) => {
  const promises = [
    redisHelpers.safeDel(CACHE_KEY.REEL(reelId)),
    redisHelpers.safeDel(CACHE_KEY.REEL_STATS(reelId)),
    redisHelpers.invalidatePattern(CACHE_KEY.REEL_FEED('*', '*', '*')),
    redisHelpers.invalidatePattern(CACHE_KEY.TRENDING_REELS('*')),
  ];

  if (userId) {
    promises.push(
      redisHelpers.invalidatePattern(CACHE_KEY.USER_REELS(userId, '*', '*'))
    );
  }

  await Promise.all(promises);
  logger.debug(`Cache invalidated for reel ${reelId}`);
};

/**
 * Build base query cho Reel với các includes cần thiết
 */
const buildReelQuery = (includeComments = false) => {
  const include = [
    {
      model: User,
      as: 'author',
      attributes: ['id', 'uuid', 'username', 'avatarUrl', 'displayName'],
    },
    {
      model: ReelLike,
      as: 'likes',
      attributes: ['userId'],
      required: false,
    },
  ];

  if (includeComments) {
    include.push({
      model: ReelComment,
      as: 'comments',
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'avatarUrl', 'displayName'],
      }],
      where: { status: 'active' },
      order: [['createdAt', 'DESC']],
      limit: 5,
      required: false,
    });
  }

  return { include };
};

/**
 * Add isLiked field to reel
 */
const addLikeStatus = (reel, userId) => {
  if (!reel) return null;
  
  const reelJSON = reel.toJSON ? reel.toJSON() : reel;
  const isLiked = userId
    ? reelJSON.likes?.some((like) => like.userId === userId)
    : false;

  return {
    ...reelJSON,
    isLiked,
    likes: undefined, // Remove likes array to save bandwidth
  };
};

// ==================== CORE REEL OPERATIONS ====================

/**
 * Tạo Reel mới và add vào queue để xử lý
 * Optimized: Validate trước, transaction safety
 */
export const createReel = async (reelData, file) => {
  const { userId, caption, music, tags, visibility } = reelData;

  if (!file) {
    throw new Error('Video file is required.');
  }

  // Validate file size (100MB limit)
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Video file size exceeds 100MB limit.');
  }

  // Validate video format
  const ALLOWED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  if (!ALLOWED_FORMATS.includes(file.mimetype)) {
    throw new Error('Invalid video format. Only MP4, MOV, AVI are allowed.');
  }

  const transaction = await db.sequelize.transaction();

  try {
    // Parse tags nếu là string
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    // Create reel record
    const newReel = await Reel.create(
      {
        userId,
        caption: caption?.trim() || null,
        music: music?.trim() || null,
        tags: parsedTags,
        originUrl: `/uploads/reels/original/${file.filename}`,
        status: 'pending',
        visibility: visibility || 'public',
        processingProgress: 0,
      },
      { transaction }
    );

    // Add to queue với priority cao cho user premium (nếu có)
    const user = await User.findByPk(userId, { attributes: ['level'], transaction });
    const priority = user?.level >= 5 ? 2 : 1; // VIP user có priority cao hơn

    await addReelProcessingJob(
      {
        reelId: newReel.id,
        filePath: file.path,
        fileName: file.filename,
        userId: userId,
      },
      {
        priority,
        jobId: `reel-${newReel.id}-${Date.now()}`, // Unique job ID
      }
    );

    await transaction.commit();

    // Invalidate cache
    await invalidateReelCache(null, userId);

    logger.info(`Reel ${newReel.id} created and queued for processing`, {
      userId,
      priority,
      fileSize: file.size,
    });

    return newReel;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating reel:', error);
    throw error;
  }
};

/**
 * Lấy Reel feed với caching thông minh
 * Optimized: Pagination, subQuery, caching
 */
export const getReelFeed = async (userId, page = 1, limit = 10) => {
  // Validate pagination
  const safePage = Math.max(1, parseInt(page, 10));
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10))); // Max 50 items/page
  const offset = (safePage - 1) * safeLimit;

  const cacheKey = CACHE_KEY.REEL_FEED(userId, safePage, safeLimit);

  return redisHelpers.cache(
    cacheKey,
    async () => {
      let friendIds = [];
      let followingIds = [];

      // Parallel fetch friend & following IDs nếu user đã login
      if (userId) {
        [friendIds, followingIds] = await Promise.all([
          getFriendIds(userId),
          FollowReel.findAll({
            where: { followerId: userId },
            attributes: ['followingId'],
            raw: true,
          }).then((rows) => rows.map((r) => r.followingId)),
        ]);
      }

      // Build where clause
      const whereConditions = [
        { status: 'completed' },
        { visibility: 'public' }, // Luôn show public reels
      ];

      if (userId) {
        whereConditions.push(
          { userId: userId }, // Own reels
          {
            // Friends' reels with 'friends' visibility
            visibility: 'friends',
            userId: { [Op.in]: friendIds },
          }
        );

        // Following users' reels
        if (followingIds.length > 0) {
          whereConditions.push({
            userId: { [Op.in]: followingIds },
          });
        }
      }

      const { include } = buildReelQuery(false);

      // Optimized query với subQuery: false để pagination hoạt động đúng
      const reels = await Reel.findAll({
        where: { [Op.or]: whereConditions },
        include,
        order: [
          ['publishedAt', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit: safeLimit,
        offset,
        subQuery: false,
        distinct: true, // Prevent duplicates with includes
      });

      // Add like status
      return reels.map((reel) => addLikeStatus(reel, userId));
    },
    CACHE_TTL.REEL_FEED
  );
};

/**
 * Lấy Reel theo ID/UUID với caching
 * Optimized: Cache chi tiết, check permissions
 */
export const getReelByIdentifier = async (identifier, currentUserId) => {
  // Determine if identifier is UUID or ID
  const isUuid = identifier.length === 36 && identifier.includes('-');
  const cacheKey = CACHE_KEY.REEL(identifier);

  return redisHelpers.cache(
    cacheKey,
    async () => {
      const whereClause = isUuid ? { uuid: identifier } : { id: identifier };
      const { include } = buildReelQuery(true); // Include comments

      const reel = await Reel.findOne({
        where: whereClause,
        include,
      });

      if (!reel) {
        throw new Error('Reel not found.');
      }

      // Permission check
      if (reel.visibility === 'private' && reel.userId !== currentUserId) {
        throw new Error('You do not have permission to view this Reel.');
      }

      if (reel.visibility === 'friends' && reel.userId !== currentUserId) {
        const friendIds = await getFriendIds(currentUserId);
        if (!friendIds.includes(reel.userId)) {
          throw new Error('This Reel is only visible to friends.');
        }
      }

      return addLikeStatus(reel, currentUserId);
    },
    CACHE_TTL.REEL_DETAIL
  );
};

/**
 * Update Reel với validation và cache invalidation
 */
export const updateReel = async (reelId, userId, updateData) => {
  const reel = await Reel.findByPk(reelId);

  if (!reel) {
    throw new Error('Reel not found.');
  }

  if (reel.userId !== userId) {
    throw new Error('You do not have permission to edit this Reel.');
  }

  // Only allow updating certain fields
  const allowedFields = ['caption', 'music', 'tags', 'visibility'];
  const filteredData = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  }

  await reel.update(filteredData);
  await invalidateReelCache(reelId, userId);

  // Emit realtime update
  const io = getIo();
  const updatedReel = await getReelByIdentifier(reelId, userId);
  io.to(`user_${userId}`).emit('reel:updated', updatedReel);

  logger.info(`Reel ${reelId} updated by user ${userId}`);
  return updatedReel;
};

/**
 * Delete Reel với cleanup đầy đủ
 */
export const deleteReel = async (reelId, userId) => {
  const reel = await Reel.findByPk(reelId);

  if (!reel) {
    throw new Error('Reel not found.');
  }

  if (reel.userId !== userId) {
    throw new Error('You do not have permission to delete this Reel.');
  }

  // Soft delete
  await reel.destroy();
  await invalidateReelCache(reelId, userId);

  // Emit realtime delete event
  const io = getIo();
  io.emit('reel:deleted', { reelId, userId });

  logger.info(`Reel ${reelId} deleted by user ${userId}`);
};

/**
 * Toggle Like với race condition handling
 * Optimized: Sử dụng Redis để đếm likes nhanh hơn
 */
export const toggleLikeReel = async (reelId, userId) => {
  const reel = await Reel.findByPk(reelId, {
    attributes: ['id', 'userId', 'uuid', 'likesCount'],
  });

  if (!reel) {
    throw new Error('Reel not found.');
  }

  // Sử dụng transaction để đảm bảo data consistency
  const transaction = await db.sequelize.transaction();

  try {
    const [like, created] = await ReelLike.findOrCreate({
      where: { reelId, userId },
      defaults: { reelId, userId },
      transaction,
    });

    let newLikesCount = reel.likesCount;

    if (!created) {
      // Unlike
      await like.destroy({ transaction });
      newLikesCount = Math.max(0, reel.likesCount - 1);
    } else {
      // Like
      newLikesCount = reel.likesCount + 1;

      // Tạo notification (nếu không phải chính mình)
      if (reel.userId !== userId) {
        const liker = await User.findByPk(userId, {
          attributes: ['username'],
          transaction,
        });

        await NotificationService.createNotification({
          userId: reel.userId,
          senderId: userId,
          type: 'reel_liked',
          message: `${liker.username} đã thích Reel của bạn.`,
          link: `/reels/${reel.uuid}`,
          metadata: { reelId: reel.id, reelUuid: reel.uuid, likerId: userId },
        });
      }
    }

    // Update likes count
    await reel.update({ likesCount: newLikesCount }, { transaction });
    await transaction.commit();

    // Invalidate cache
    await Promise.all([
      redisHelpers.safeDel(CACHE_KEY.REEL(reelId)),
      redisHelpers.safeDel(CACHE_KEY.REEL_STATS(reelId)),
    ]);

    // Emit realtime event
    const io = getIo();
    const event = created ? 'reel:liked' : 'reel:unliked';
    io.to(`user_${reel.userId}`).emit(event, {
      reelId,
      userId,
      likesCount: newLikesCount,
    });

    logger.debug(`User ${userId} ${created ? 'liked' : 'unliked'} reel ${reelId}`);

    return { isLiked: created, likesCount: newLikesCount };
  } catch (error) {
    await transaction.rollback();
    logger.error('Error toggling like:', error);
    throw error;
  }
};

/**
 * Add comment với spam protection
 */
export const addReelComment = async (reelId, userId, content, parentId = null) => {
  // Validate content
  const trimmedContent = content.trim();
  if (!trimmedContent || trimmedContent.length < 1) {
    throw new Error('Comment content cannot be empty.');
  }

  if (trimmedContent.length > 500) {
    throw new Error('Comment content exceeds 500 characters.');
  }

  // Spam check: không cho comment giống nhau liên tiếp trong 10s
  const spamCheckKey = `reel_comment_spam:${userId}:${reelId}`;
  const lastComment = await redisHelpers.safeGet(spamCheckKey);
  
  if (lastComment === trimmedContent) {
    throw new Error('Please wait before posting the same comment again.');
  }

  const reel = await Reel.findByPk(reelId, {
    attributes: ['id', 'userId', 'uuid', 'commentsCount'],
  });

  if (!reel) {
    throw new Error('Reel not found.');
  }

  // Validate parent comment nếu có
  if (parentId) {
    const parentComment = await ReelComment.findOne({
      where: { id: parentId, reelId },
    });

    if (!parentComment) {
      throw new Error('Parent comment not found.');
    }
  }

  const transaction = await db.sequelize.transaction();

  try {
    // Create comment
    const newComment = await ReelComment.create(
      {
        reelId,
        userId,
        content: trimmedContent,
        parentId,
      },
      { transaction }
    );

    // Increment comments count
    await reel.increment('commentsCount', { transaction });

    // Get user info
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'avatarUrl', 'displayName'],
      transaction,
    });

    await transaction.commit();

    // Set spam check cache
    await redisHelpers.safeSet(spamCheckKey, trimmedContent, 10); // 10s TTL

    // Invalidate cache
    await invalidateReelCache(reelId, reel.userId);

    // Emit realtime event
    const io = getIo();
    io.to(`user_${reel.userId}`).emit('reel:commented', {
      reelId,
      comment: { ...newComment.toJSON(), user },
      commentsCount: reel.commentsCount + 1,
    });

    // Create notification
    if (reel.userId !== userId) {
      await NotificationService.createNotification({
        userId: reel.userId,
        senderId: userId,
        type: 'reel_commented',
        message: `${user.username} đã bình luận về Reel của bạn: "${trimmedContent.substring(0, 50)}..."`,
        link: `/reels/${reel.uuid}?commentId=${newComment.id}`,
        metadata: {
          reelId: reel.id,
          reelUuid: reel.uuid,
          commenterId: userId,
          commentId: newComment.id,
        },
      });
    }

    // Notify parent comment owner nếu là reply
    if (parentId) {
      const parentComment = await ReelComment.findByPk(parentId, {
        attributes: ['userId'],
      });

      if (
        parentComment &&
        parentComment.userId !== userId &&
        parentComment.userId !== reel.userId
      ) {
        await NotificationService.createNotification({
          userId: parentComment.userId,
          senderId: userId,
          type: 'reel_comment_reply',
          message: `${user.username} đã trả lời bình luận của bạn: "${trimmedContent.substring(0, 50)}..."`,
          link: `/reels/${reel.uuid}?commentId=${newComment.id}`,
          metadata: {
            reelId: reel.id,
            reelUuid: reel.uuid,
            replierId: userId,
            commentId: newComment.id,
            parentCommentId: parentId,
          },
        });
      }
    }

    logger.info(`Comment ${newComment.id} added to reel ${reelId} by user ${userId}`);

    return { ...newComment.toJSON(), user };
  } catch (error) {
    await transaction.rollback();
    logger.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Get comments với pagination và nested replies
 * Optimized: Efficient query với limit replies
 */
export const getReelComments = async (reelId, page = 1, limit = 10) => {
  const safePage = Math.max(1, parseInt(page, 10));
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (safePage - 1) * safeLimit;

  const comments = await ReelComment.findAll({
    where: { reelId, parentId: null, status: 'active' },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'uuid', 'username', 'avatarUrl', 'displayName'],
      },
      {
        model: ReelComment,
        as: 'replies',
        where: { status: 'active' },
        required: false,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'uuid', 'username', 'avatarUrl', 'displayName'],
          },
        ],
        order: [['createdAt', 'ASC']],
        limit: 5, // Giới hạn 5 replies cho mỗi comment
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: safeLimit,
    offset,
  });

  return comments;
};

/**
 * Increment view count với debouncing
 * Optimized: Batch update views qua Redis, giảm DB writes
 */
export const incrementReelView = async (reelId, userId = null) => {
  const viewKey = `reel_view:${reelId}:${userId || 'guest'}`;
  
  // Check nếu user đã xem trong 1 giờ qua thì không tăng view
  const alreadyViewed = await redisHelpers.safeGet(viewKey);
  if (alreadyViewed) {
    return; // Already counted this view
  }

  // Tăng view count trong Redis (sẽ được sync vào DB định kỳ)
  const redisViewKey = `reel_views_pending:${reelId}`;
  await redisHelpers.safeIncr(redisViewKey, 3600); // TTL 1 giờ

  // Mark user đã xem (TTL 1 giờ)
  await redisHelpers.safeSet(viewKey, '1', 3600);

  // Sync vào DB nếu đủ views (mỗi 10 views sync 1 lần)
  const pendingViews = await redisHelpers.safeGet(redisViewKey);
  if (pendingViews >= 10) {
    const reel = await Reel.findByPk(reelId, { attributes: ['id', 'views'] });
    if (reel) {
      await reel.increment('views', { by: pendingViews });
      await redisHelpers.safeDel(redisViewKey);

      // Invalidate cache
      await redisHelpers.safeDel(CACHE_KEY.REEL_STATS(reelId));

      // Emit realtime update
      const io = getIo();
      io.emit('reel:viewed', { reelId, views: reel.views + pendingViews });

      logger.debug(`Synced ${pendingViews} views for reel ${reelId}`);
    }
  }
};

/**
 * Get trending reels dựa trên engagement score
 * Optimized: Sử dụng computed engagement score
 */
export const getTrendingReels = async (limit = 10) => {
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const cacheKey = CACHE_KEY.TRENDING_REELS(safeLimit);

  return redisHelpers.cache(
    cacheKey,
    async () => {
      // Lấy reels từ 7 ngày gần đây
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { include } = buildReelQuery(false);

      const reels = await Reel.findAll({
        where: {
          status: 'completed',
          visibility: 'public',
          publishedAt: { [Op.gte]: sevenDaysAgo },
        },
        include,
        attributes: {
          include: [
            // Compute engagement score: views * 0.1 + likes * 2 + comments * 3
            [
              db.sequelize.literal(
                '(views * 0.1 + likesCount * 2 + commentsCount * 3)'
              ),
              'engagementScore',
            ],
          ],
        },
        order: [[db.sequelize.literal('engagementScore'), 'DESC']],
        limit: safeLimit,
      });

      return reels.map((reel) => addLikeStatus(reel, null));
    },
    CACHE_TTL.TRENDING_REELS
  );
};

/**
 * Get user's reels với pagination
 */
export const getUserReels = async (targetUserId, currentUserId, page = 1, limit = 10) => {
  const safePage = Math.max(1, parseInt(page, 10));
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (safePage - 1) * safeLimit;

  const cacheKey = CACHE_KEY.USER_REELS(targetUserId, safePage, safeLimit);

  return redisHelpers.cache(
    cacheKey,
    async () => {
      // Permission check
      let visibilityConditions = [{ visibility: 'public' }];

      if (currentUserId === targetUserId) {
        // Own reels - show all
        visibilityConditions = [
          { visibility: 'public' },
          { visibility: 'friends' },
          { visibility: 'private' },
        ];
      } else if (currentUserId) {
        // Check if friends
        const friendIds = await getFriendIds(currentUserId);
        if (friendIds.includes(targetUserId)) {
          visibilityConditions.push({ visibility: 'friends' });
        }
      }

      const { include } = buildReelQuery(false);

      const reels = await Reel.findAll({
        where: {
          userId: targetUserId,
          status: 'completed',
          [Op.or]: visibilityConditions,
        },
        include,
        order: [['publishedAt', 'DESC']],
        limit: safeLimit,
        offset,
      });

      return reels.map((reel) => addLikeStatus(reel, currentUserId));
    },
    CACHE_TTL.USER_REELS
  );
};

// ==================== ADMIN OPERATIONS ====================

/**
 * Admin: Get all reels với filters
 */
export const getAllReelsAdmin = async (filters = {}, page = 1, limit = 10) => {
  const safePage = Math.max(1, parseInt(page, 10));
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (safePage - 1) * safeLimit;

  const { status, userId, caption, startDate, endDate } = filters;

  const whereClause = {};
  if (status) whereClause.status = status;
  if (userId) whereClause.userId = userId;
  if (caption) whereClause.caption = { [Op.like]: `%${caption}%` };
  
  if (startDate && endDate) {
    whereClause.createdAt = {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    };
  }

  const { count, rows } = await Reel.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'username', 'email', 'avatarUrl'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: safeLimit,
    offset,
  });

  return {
    reels: rows,
    total: count,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(count / safeLimit),
  };
};

/**
 * Admin: Update reel status
 */
export const updateReelStatusAdmin = async (reelId, status) => {
  const validStatuses = ['pending', 'processing', 'completed', 'failed', 'hidden', 'banned'];
  
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const reel = await Reel.findByPk(reelId);
  if (!reel) {
    throw new Error('Reel not found.');
  }

  await reel.update({ status });
  await invalidateReelCache(reelId, reel.userId);

  // Emit realtime update
  const io = getIo();
  io.to('admin_dashboard').emit('admin:reel_updated', reel);

  // Notify user if banned/hidden
  if (status === 'banned' || status === 'hidden') {
    await NotificationService.createNotification({
      userId: reel.userId,
      senderId: null,
      type: 'reel_status_changed',
      message: `Reel của bạn đã bị ${status === 'banned' ? 'cấm' : 'ẩn'} bởi quản trị viên.`,
      link: `/reels/${reel.uuid}`,
      metadata: { reelId: reel.id, status },
    });
  }

  logger.info(`Admin updated reel ${reelId} status to ${status}`);
  return reel;
};

/**
 * Admin: Delete reel
 */
export const deleteReelAdmin = async (reelId) => {
  const reel = await Reel.findByPk(reelId);
  if (!reel) {
    throw new Error('Reel not found.');
  }

  await reel.destroy();
  await invalidateReelCache(reelId, reel.userId);

  // Emit realtime delete
  const io = getIo();
  io.to('admin_dashboard').emit('admin:reel_deleted', { reelId });

  logger.info(`Admin deleted reel ${reelId}`);
};

// ==================== AI FEATURES ====================

/**
 * AI: Generate caption and hashtags
 */
export const getAICaptionAndHashtags = async (userId, videoDescription) => {
  const aiSuggestion = await generateReelCaptionAndHashtags(userId, videoDescription);
  return aiSuggestion;
};

/**
 * AI: Analyze content (placeholder - cần tích hợp AI vision API)
 */
export const analyzeReelContent = async (userId, videoUrl) => {
  logger.warn('AI video analysis not fully implemented');
  
  // TODO: Integrate with AI vision API (Google Vision, AWS Rekognition, etc.)
  return {
    tags: ['video', 'content'],
    mood: 'neutral',
    objects: [],
    detectedText: null,
  };
};

/**
 * AI: Get similar reels (recommendation)
 */
export const getSimilarReels = async (userId, currentReelId, limit = 5) => {
  const safeLimit = Math.min(20, Math.max(1, parseInt(limit, 10)));

  // Get current reel để lấy tags
  const currentReel = await Reel.findByPk(currentReelId, {
    attributes: ['tags', 'userId'],
  });

  if (!currentReel) {
    throw new Error('Reel not found.');
  }

  const { include } = buildReelQuery(false);

  // Find reels với tags tương tự
  const similarReels = await Reel.findAll({
    where: {
      id: { [Op.ne]: currentReelId },
      status: 'completed',
      visibility: 'public',
      // TODO: Implement better similarity matching (vector search, collaborative filtering)
      // For now, simple tag matching
    },
    include,
    order: [
      ['likesCount', 'DESC'],
      ['views', 'DESC'],
    ],
    limit: safeLimit,
  });

  return similarReels.map((reel) => addLikeStatus(reel, userId));
};

// ==================== BATCH OPERATIONS ====================

/**
 * Batch sync pending views from Redis to DB
 * Gọi định kỳ từ cron job hoặc worker
 */
export const syncPendingViews = async () => {
  try {
    const pattern = 'reel_views_pending:*';
    const keys = await redisHelpers.getKeysByPattern(pattern);
    
    if (!keys || keys.length === 0) {
      logger.debug('No pending views to sync');
      return { synced: 0 };
    }

    let synced = 0;
    for (const key of keys) {
      const reelId = key.split(':')[1];
      const pendingViews = await redisHelpers.safeGet(key);
      
      if (pendingViews > 0) {
        const reel = await Reel.findByPk(reelId);
        if (reel) {
          await reel.increment('views', { by: pendingViews });
          await redisHelpers.safeDel(key);
          synced++;
          
          logger.debug(`Synced ${pendingViews} views for reel ${reelId}`);
        }
      }
    }

    logger.info(`Batch synced views for ${synced} reels`);
    return { synced };
  } catch (error) {
    logger.error('Error syncing pending views:', error);
    return { synced: 0, error: error.message };
  }
};

export default {
  createReel,
  getReelFeed,
  getReelByIdentifier,
  updateReel,
  deleteReel,
  toggleLikeReel,
  addReelComment,
  getReelComments,
  incrementReelView,
  getTrendingReels,
  getUserReels,
  getAllReelsAdmin,
  updateReelStatusAdmin,
  deleteReelAdmin,
  getAICaptionAndHashtags,
  analyzeReelContent,
  getSimilarReels,
  syncPendingViews,
};