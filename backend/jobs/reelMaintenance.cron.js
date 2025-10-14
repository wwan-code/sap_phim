import cron from 'node-cron';
import logger from '../utils/logger.js';
import { syncPendingViews } from '../services/reel.service.js';
import { cleanOldFiles, getOriginalFilePath } from '../utils/video.utils.js';
import { cleanQueue, getQueueMetrics, addReelProcessingJob } from '../config/bullmq.js';
import db from '../models/index.js';

/**
 * ==================== REEL MAINTENANCE CRON JOBS ====================
 * 
 * Các task định kỳ để maintain hệ thống Reels:
 * 1. Sync pending views từ Redis → DB
 * 2. Clean old temporary files
 * 3. Clean completed/failed jobs trong queue
 * 4. Log queue metrics
 */

/**
 * Task 1: Sync pending views từ Redis vào Database
 * Chạy mỗi 5 phút
 * 
 * Tại sao cần: View counting được buffer trong Redis để tránh quá nhiều DB writes.
 * Job này sync định kỳ để đảm bảo data consistency.
 */
const syncViewsTask = cron.schedule(
  '*/5 * * * *', // Every 5 minutes
async () => {
  try {
    logger.info('🔄 [CRON] Starting view sync task...');
    const result = await syncPendingViews();
    
    if (result.synced > 0) {
      logger.info(`✅ [CRON] View sync completed: ${result.synced} reels updated`);
    } else {
      logger.debug('[CRON] No pending views to sync');
    }
  } catch (error) {
    logger.error('❌ [CRON] View sync task failed:', error);
  }
},
{
  scheduled: false, // Don't start automatically
  timezone: 'Asia/Ho_Chi_Minh',
}
);

/**
 * Task 2: Clean old temporary files
 * Chạy mỗi ngày lúc 3:00 AM
 * 
 * Tại sao cần: Cleanup old original videos và failed processing files
 * để tiết kiệm storage.
 */
const cleanFilesTask = cron.schedule(
  '0 3 * * *', // Daily at 3:00 AM
  async () => {
    try {
      logger.info('🧹 [CRON] Starting file cleanup task...');
      
      // Clean files older than 7 days
      const result = await cleanOldFiles(7);
      
      if (result.deletedCount > 0) {
        logger.info(
          `✅ [CRON] File cleanup completed: ${result.deletedCount} files deleted, ` +
          `${(result.freedSpace / 1024 / 1024).toFixed(2)} MB freed`
        );
      } else {
        logger.info('[CRON] No old files to clean');
      }
    } catch (error) {
      logger.error('❌ [CRON] File cleanup task failed:', error);
    }
  },
  {
    scheduled: false,
    timezone: 'Asia/Ho_Chi_Minh',
  }
);

/**
 * Task 3: Clean completed/failed jobs trong BullMQ
 * Chạy mỗi 6 giờ
 * 
 * Tại sao cần: Tránh queue bị đầy jobs cũ, gây memory leak.
 */
const cleanQueueTask = cron.schedule(
  '0 */6 * * *', // Every 6 hours
  async () => {
    try {
      logger.info('🧹 [CRON] Starting queue cleanup task...');
      
      // Clean completed jobs older than 24 hours
      const result = await cleanQueue(24 * 3600 * 1000);
      
      if (result) {
        logger.info(
          `✅ [CRON] Queue cleanup completed: ${result.completed} completed jobs, ` +
          `${result.failed} failed jobs removed`
        );
      }
    } catch (error) {
      logger.error('❌ [CRON] Queue cleanup task failed:', error);
    }
  },
  {
    scheduled: false,
    timezone: 'Asia/Ho_Chi_Minh',
  }
);

/**
 * Task 4: Log queue metrics for monitoring
 * Chạy mỗi 10 phút
 * 
 * Tại sao cần: Monitoring queue health để detect issues sớm.
 */
const logQueueMetricsTask = cron.schedule(
  '*/10 * * * *', // Every 10 minutes
  async () => {
    try {
      const metrics = await getQueueMetrics();
      
      if (metrics) {
        logger.info('📊 [CRON] Queue metrics:', {
          waiting: metrics.waiting,
          active: metrics.active,
          completed: metrics.completed,
          failed: metrics.failed,
          delayed: metrics.delayed,
          total: metrics.total,
        });

        // Alert nếu có quá nhiều failed jobs
        if (metrics.failed > 10) {
          logger.warn(`⚠️ [ALERT] High number of failed jobs: ${metrics.failed}`);
        }

        // Alert nếu có quá nhiều pending jobs
        if (metrics.waiting > 50) {
          logger.warn(`⚠️ [ALERT] High number of waiting jobs: ${metrics.waiting}`);
        }
      }
    } catch (error) {
      logger.error('❌ [CRON] Queue metrics logging failed:', error);
    }
  },
  {
    scheduled: false,
    timezone: 'Asia/Ho_Chi_Minh',
  }
);

/**
 * Task 5: Check và retry failed reels
 * Chạy mỗi 30 phút
 * 
 * Tại sao cần: Một số reels fail do temporary issues (network, resource),
 * auto-retry có thể giúp recover.
 */
const retryFailedReelsTask = cron.schedule(
  '*/30 * * * *', // Every 30 minutes
  async () => {
    try {
      logger.info('🔄 [CRON] Checking failed reels for retry...');
      
      const { Reel, Sequelize } = db;

      // Find reels that failed less than 24 hours ago and haven't been retried much
      const failedReels = await Reel.findAll({
        where: {
          status: 'failed',
          updatedAt: {
            [Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        attributes: ['id', 'userId', 'originUrl', 'failedReason'],
        limit: 5, // Retry tối đa 5 reels mỗi lần
      });

      if (failedReels.length === 0) {
        logger.debug('[CRON] No failed reels to retry');
        return;
      }

      for (const reel of failedReels) {
        // Only retry if error seems temporary
        const retryableErrors = ['timeout', 'ECONNRESET', 'ETIMEDOUT', 'network'];
        const isRetryable = retryableErrors.some((err) =>
          reel.failedReason?.toLowerCase().includes(err)
        );

        if (isRetryable) {
          try {
            // Extract filename from originUrl
            const fileName = reel.originUrl.split('/').pop();
            const filePath = getOriginalFilePath(fileName);

            // Add back to queue with lower priority
            await addReelProcessingJob(
              {
                reelId: reel.id,
                filePath,
                fileName,
                userId: reel.userId,
              },
              {
                priority: 5, // Low priority
                attempts: 1, // Only 1 retry attempt
              }
            );

            // Update reel status to pending
            await reel.update({ status: 'pending', processingProgress: 0 });

            logger.info(`✅ [CRON] Reel ${reel.id} queued for retry`);
          } catch (retryError) {
            logger.error(`Failed to retry reel ${reel.id}:`, retryError);
          }
        }
      }

      logger.info(`✅ [CRON] Retry check completed: ${failedReels.length} reels checked`);
    } catch (error) {
      logger.error('❌ [CRON] Failed reels retry task failed:', error);
    }
  },
  {
    scheduled: false,
    timezone: 'Asia/Ho_Chi_Minh',
  }
);

// ==================== TASK MANAGER ====================

/**
 * Start all cron tasks
 */
export const startAllTasks = () => {
  syncViewsTask.start();
  cleanFilesTask.start();
  cleanQueueTask.start();
  logQueueMetricsTask.start();
  retryFailedReelsTask.start();

  logger.info('✅ All Reel maintenance cron tasks started', {
    tasks: [
      'syncViews (every 5 min)',
      'cleanFiles (daily 3 AM)',
      'cleanQueue (every 6 hours)',
      'logMetrics (every 10 min)',
      'retryFailed (every 30 min)',
    ],
  });
};

/**
 * Stop all cron tasks
 */
export const stopAllTasks = () => {
  syncViewsTask.stop();
  cleanFilesTask.stop();
  cleanQueueTask.stop();
  logQueueMetricsTask.stop();
  retryFailedReelsTask.stop();

  logger.info('🛑 All Reel maintenance cron tasks stopped');
};

/**
 * Get status of all tasks
 */
export const getTasksStatus = () => {
  return {
    syncViews: {
      running: syncViewsTask.running,
      schedule: '*/5 * * * *',
      description: 'Sync pending views from Redis to DB',
    },
    cleanFiles: {
      running: cleanFilesTask.running,
      schedule: '0 3 * * *',
      description: 'Clean old temporary files',
    },
    cleanQueue: {
      running: cleanQueueTask.running,
      schedule: '0 */6 * * *',
      description: 'Clean completed/failed jobs',
    },
    logMetrics: {
      running: logQueueMetricsTask.running,
      schedule: '*/10 * * * *',
      description: 'Log queue metrics',
    },
    retryFailed: {
      running: retryFailedReelsTask.running,
      schedule: '*/30 * * * *',
      description: 'Retry failed reels',
    },
  };
};

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = () => {
  logger.info('🛑 Shutting down cron tasks...');
  stopAllTasks();
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default {
  startAllTasks,
  stopAllTasks,
  getTasksStatus,
};