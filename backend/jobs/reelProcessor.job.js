import { setupReelWorker } from '../config/bullmq.js';
import {
  getVideoMetadata,
  compressVideo,
  generateThumbnail,
  deleteFile,
  getOriginalFilePath,
} from '../utils/video.utils.js';
import db from '../models/index.js';
import logger from '../utils/logger.js';
import { getIo } from '../config/socket.js';
import * as NotificationService from '../services/notification.service.js';
import { redisHelpers } from '../config/redis.js';
import path from 'path';

const { Reel, User, FollowReel } = db;

/**
 * ==================== MAIN REEL PROCESSOR ====================
 * Xử lý video: metadata extraction → thumbnail generation → video compression
 * 
 * Flow:
 * 1. Update status → 'processing'
 * 2. Extract metadata (duration, dimensions, size)
 * 3. Generate thumbnail
 * 4. Compress video (H.264, optimized for web)
 * 5. Update status → 'completed'
 * 6. Cleanup original file
 * 7. Emit realtime events & notifications
 */
const reelProcessor = async (job) => {
  const { reelId, filePath, fileName, userId } = job.data;
  const io = getIo();

  // Validate job data
  if (!reelId || !filePath || !fileName || !userId) {
    throw new Error('Invalid job data: missing required fields');
  }

  let reel = null;

  try {
    logger.info(`[Job ${job.id}] Starting processing for reel ${reelId}`, {
      fileName,
      userId,
      attempt: job.attemptsMade + 1,
    });

    // ==================== STEP 1: Initialize Processing ====================
    reel = await Reel.findByPk(reelId);
    if (!reel) {
      throw new Error(`Reel ${reelId} not found in database`);
    }

    // Check if already processing/completed
    if (reel.status === 'processing' && job.attemptsMade === 0) {
      logger.warn(`Reel ${reelId} is already being processed`);
      return;
    }

    if (reel.status === 'completed') {
      logger.info(`Reel ${reelId} already completed, skipping`);
      return;
    }

    await reel.update({ status: 'processing', processingProgress: 0 });
    await job.updateProgress(5);

    // Emit realtime status update
    io.to(`user_${userId}`).emit('reel:processing_started', {
      reelId,
      status: 'processing',
      progress: 5,
    });

    const originalFilePath = getOriginalFilePath(fileName);

    // ==================== STEP 2: Extract Video Metadata ====================
    logger.info(`[Job ${job.id}] Extracting metadata for reel ${reelId}`);
    
    const metadata = await getVideoMetadata(originalFilePath);
    
    // Validate video duration (max 60s for reels)
    const MAX_DURATION = 60; // seconds
    if (metadata.duration > MAX_DURATION) {
      throw new Error(`Video duration exceeds ${MAX_DURATION}s limit`);
    }

    await reel.update({
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      size: metadata.size,
      processingProgress: 20,
    });

    await job.updateProgress(20);
    io.to(`user_${userId}`).emit('reel:processing_progress', {
      reelId,
      progress: 20,
      stage: 'metadata_extracted',
    });

    logger.info(`[Job ${job.id}] Metadata extracted`, {
      duration: metadata.duration,
      dimensions: `${metadata.width}x${metadata.height}`,
      size: metadata.size,
    });

    // ==================== STEP 3: Generate Thumbnail ====================
    logger.info(`[Job ${job.id}] Generating thumbnail for reel ${reelId}`);
    
    const thumbnailFileName = `${path.parse(fileName).name}.jpg`;
    const thumbnailUrl = await generateThumbnail(originalFilePath, thumbnailFileName);
    
    await reel.update({
      thumbnailUrl,
      processingProgress: 40,
    });

    await job.updateProgress(40);
    io.to(`user_${userId}`).emit('reel:processing_progress', {
      reelId,
      progress: 40,
      stage: 'thumbnail_generated',
      thumbnailUrl,
    });

    logger.info(`[Job ${job.id}] Thumbnail generated: ${thumbnailUrl}`);

    // ==================== STEP 4: Compress Video ====================
    logger.info(`[Job ${job.id}] Starting video compression for reel ${reelId}`);
    
    const processedFileName = `${path.parse(fileName).name}-processed.mp4`;
    
    // Progress callback cho compression
    const compressionProgress = (progress) => {
      const totalProgress = 40 + Math.floor(progress * 0.5); // 40% → 90%
      job.updateProgress(totalProgress);
      
      // Emit progress mỗi 10%
      if (progress % 10 === 0) {
        io.to(`user_${userId}`).emit('reel:processing_progress', {
          reelId,
          progress: totalProgress,
          stage: 'compressing',
        });
      }
    };

    const videoUrl = await compressVideo(
      originalFilePath,
      processedFileName,
      compressionProgress
    );

    await reel.update({
      videoUrl,
      processingProgress: 90,
    });

    await job.updateProgress(90);
    logger.info(`[Job ${job.id}] Video compressed: ${videoUrl}`);

    // ==================== STEP 5: Mark as Completed ====================
    const publishedAt = new Date();
    await reel.update({
      status: 'completed',
      processingProgress: 100,
      publishedAt,
    });

    await job.updateProgress(100);

    logger.info(`[Job ${job.id}] Reel ${reelId} processing completed`, {
      processingTime: Date.now() - job.processedOn,
      videoUrl,
    });

    // ==================== STEP 6: Cleanup Original File ====================
    // Xóa file gốc để tiết kiệm storage (đã có file compressed)
    try {
      await deleteFile(originalFilePath);
      logger.info(`[Job ${job.id}] Original file deleted: ${originalFilePath}`);
    } catch (cleanupError) {
      // Non-critical error, log nhưng không throw
      logger.warn(`Failed to delete original file: ${cleanupError.message}`);
    }

    // ==================== STEP 7: Fetch Full Reel Data ====================
    const completedReel = await Reel.findByPk(reelId, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'uuid', 'username', 'avatarUrl', 'displayName'],
        },
      ],
    });

    // ==================== STEP 8: Get Followers & Emit Events ====================
    const followers = await FollowReel.findAll({
      where: { followingId: userId },
      attributes: ['followerId'],
      raw: true,
    });

    const followerIds = followers.map((f) => f.followerId);

    // Emit to author
    io.to(`user_${userId}`).emit('reel:published', {
      reel: completedReel,
      message: 'Your Reel has been published successfully!',
    });

    // Emit to followers
    if (followerIds.length > 0) {
      followerIds.forEach((followerId) => {
        io.to(`user_${followerId}`).emit('reel:new_from_following', {
          reel: completedReel,
          author: completedReel.author,
        });
      });

      logger.info(`[Job ${job.id}] Notified ${followerIds.length} followers`);
    }

    // ==================== STEP 9: Create Notifications ====================
    // Notification cho followers
    const notificationPromises = followerIds.map((followerId) =>
      NotificationService.createNotification({
        userId: followerId,
        senderId: userId,
        type: 'reel_published',
        message: `${completedReel.author.username} đã đăng một Reel mới${completedReel.caption ? `: "${completedReel.caption.substring(0, 50)}..."` : ''}`,
        link: `/reels/${completedReel.uuid}`,
        metadata: {
          reelId: completedReel.id,
          reelUuid: completedReel.uuid,
          authorUsername: completedReel.author.username,
        },
      }).catch((err) => {
        // Log nhưng không fail job
        logger.error(`Failed to create notification for follower ${followerId}:`, err);
      })
    );

    await Promise.allSettled(notificationPromises);

    // ==================== STEP 10: Cache Invalidation ====================
    // Invalidate relevant caches
    await Promise.allSettled([
      redisHelpers.invalidatePattern(`reel_feed:*`),
      redisHelpers.invalidatePattern(`trending_reels:*`),
      redisHelpers.invalidatePattern(`user_reels:${userId}:*`),
    ]);

    logger.info(`[Job ${job.id}] ✅ Reel ${reelId} fully processed and published`, {
      totalTime: Date.now() - job.timestamp,
      followers: followerIds.length,
    });

    return {
      success: true,
      reelId,
      videoUrl,
      thumbnailUrl,
      publishedAt,
    };

  } catch (error) {
    // ==================== ERROR HANDLING ====================
    logger.error(`[Job ${job.id}] ❌ Error processing reel ${reelId}:`, {
      error: error.message,
      stack: error.stack,
      attempt: job.attemptsMade + 1,
    });

    // Update reel status to failed
    if (reel) {
      await reel.update({
        status: 'failed',
        failedReason: error.message,
        processingProgress: 0,
      }).catch((updateErr) => {
        logger.error('Failed to update reel status:', updateErr);
      });
    }

    // Emit failure event
    io.to(`user_${userId}`).emit('reel:failed', {
      reelId,
      error: error.message,
      canRetry: job.attemptsMade < job.opts.attempts - 1,
    });

    // Create notification cho user
    try {
      await NotificationService.createNotification({
        userId,
        senderId: null,
        type: 'reel_processing_failed',
        message: `Xử lý Reel thất bại: ${error.message}`,
        link: `/reels/${reelId}`,
        metadata: { reelId, error: error.message },
      });
    } catch (notifError) {
      logger.error('Failed to create failure notification:', notifError);
    }

    // Re-throw để BullMQ có thể retry
    throw error;
  }
};

// ==================== WORKER INITIALIZATION ====================
/**
 * Initialize worker với custom settings
 * Tự động import processor và setup event handlers
 */
const workerOptions = {
  concurrency: parseInt(process.env.REEL_WORKER_CONCURRENCY || '3', 10),
  limiter: {
    max: parseInt(process.env.REEL_WORKER_RATE_LIMIT || '5', 10),
    duration: 1000,
  },
};

const { worker, queueEvents } = setupReelWorker(reelProcessor, workerOptions);

// ==================== ADDITIONAL WORKER EVENTS ====================

worker.on('drained', () => {
  logger.info('📭 Reel queue drained - no more jobs to process');
});

worker.on('paused', () => {
  logger.warn('⏸️  Reel worker paused');
});

worker.on('resumed', () => {
  logger.info('▶️  Reel worker resumed');
});

// ==================== HEALTH CHECK ====================
/**
 * Health check endpoint data
 */
export const getWorkerHealth = () => {
  return {
    isRunning: worker.isRunning(),
    isPaused: worker.isPaused(),
    concurrency: worker.opts.concurrency,
    name: worker.name,
  };
};

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = async () => {
  logger.info('🛑 Shutting down Reel Worker...');

  try {
    // Pause worker để không nhận job mới
    await worker.pause();
    logger.info('Worker paused, waiting for active jobs to complete...');

    // Đợi tối đa 5 phút cho jobs đang chạy
    const timeout = 5 * 60 * 1000;
    const startTime = Date.now();

    while (worker.isRunning() && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await worker.close();
    await queueEvents.close();

    logger.info('✅ Reel Worker shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during worker shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

logger.info('✅ Reel Processing Worker initialized', {
  concurrency: workerOptions.concurrency,
  rateLimit: workerOptions.limiter,
});

export default worker;