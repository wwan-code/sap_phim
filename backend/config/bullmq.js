import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

// ==================== REDIS CONNECTION POOL ====================
// Tạo connection pool để tái sử dụng kết nối, giảm overhead
const createRedisConnection = () => new IORedis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      logger.error('Redis READONLY error, reconnecting...');
      return true;
    }
    return false;
  },
  // Connection pool settings
  lazyConnect: false,
  keepAlive: 30000,
  connectTimeout: 10000,
  // Performance tuning
  enableReadyCheck: true,
  maxLoadingRetryTime: 10000,
});

// Tạo các connection riêng biệt cho Queue, Worker, Events để tránh conflict
const connectionQueue = createRedisConnection();
const connectionWorker = createRedisConnection();
const connectionEvents = createRedisConnection();

// Event handlers cho monitoring
[connectionQueue, connectionWorker, connectionEvents].forEach((conn, idx) => {
  const names = ['Queue', 'Worker', 'Events'];
  conn.on('error', (err) => logger.error(`Redis ${names[idx]} error:`, err));
  conn.on('connect', () => logger.info(`Redis ${names[idx]} connected`));
  conn.on('ready', () => logger.info(`Redis ${names[idx]} ready`));
  conn.on('close', () => logger.warn(`Redis ${names[idx]} closed`));
  conn.on('reconnecting', () => logger.warn(`Redis ${names[idx]} reconnecting...`));
});

// ==================== QUEUE CONFIGURATION ====================
/**
 * Cấu hình Queue với các options tối ưu cho video processing
 * - Sử dụng priority để xử lý các video quan trọng trước
 * - Rate limiting để tránh overload server
 * - Retry strategy thông minh
 * 
 * NOTE: Từ BullMQ v5, QueueScheduler đã được loại bỏ.
 * Stalled job handling giờ được xử lý tự động bởi Worker.
 */
export const reelQueue = new Queue('reelProcessingQueue', {
  connection: connectionQueue,
  defaultJobOptions: {
    // Tự động xóa job sau khi hoàn thành để tiết kiệm memory
    removeOnComplete: {
      age: 24 * 3600, // Giữ job 24h sau khi hoàn thành
      count: 1000, // Giữ tối đa 1000 jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Giữ job lỗi 7 ngày để debug
    },
    attempts: 3, // Retry tối đa 3 lần
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s
    },
    // Priority cao hơn = xử lý trước
    priority: 1,
  },
});

logger.info('✅ Reel Queue initialized');

// ==================== WORKER SETUP ====================
/**
 * Setup Worker với concurrency và rate limiting
 * @param {Function|string} processorPath - Processor function hoặc path đến file
 * @param {Object} options - Worker options
 */
export const setupReelWorker = (processorPath, options = {}) => {
  const defaultOptions = {
    connection: connectionWorker,
    // Concurrency: số job xử lý đồng thời
    // Cân nhắc CPU/Memory: 3-5 cho server vừa, 10+ cho server mạnh
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),
    
    // Rate limiter: giới hạn số job/giây để tránh overload
    limiter: {
      max: parseInt(process.env.WORKER_MAX_JOBS_PER_SECOND || '5', 10),
      duration: 1000,
      // Grouping để limit theo user/group nếu cần
      groupKey: 'userId', // Rate limit per user
    },
    
    // Lock settings
    lockDuration: 300000, // 5 phút
    lockRenewTime: 15000, // Renew lock mỗi 15s
    
    // Performance tuning
    runRetryDelay: 5000, // Đợi 5s trước khi retry
    
    // Advanced settings
    settings: {
      // Backoff strategy khi không có job
      backoffStrategies: {
        exponential: (attemptsMade) => Math.min(attemptsMade * 1000, 30000),
      },
    },
  };

  const worker = new Worker(
    'reelProcessingQueue',
    processorPath,
    { ...defaultOptions, ...options }
  );

  // ==================== WORKER EVENT HANDLERS ====================
  
  worker.on('completed', (job) => {
    logger.info(`✅ Job ${job.id} completed for reel ${job.data.reelId}`, {
      duration: Date.now() - job.processedOn,
      attempts: job.attemptsMade,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ Job ${job?.id} failed for reel ${job?.data?.reelId}`, {
      error: err.message,
      stack: err.stack,
      attempts: job?.attemptsMade,
      data: job?.data,
    });
  });

  worker.on('active', (job) => {
    logger.info(`🔄 Job ${job.id} started for reel ${job.data.reelId}`, {
      attemptsMade: job.attemptsMade,
      timestamp: new Date().toISOString(),
    });
  });

  worker.on('progress', (job, progress) => {
    logger.debug(`📊 Job ${job.id} progress: ${progress}%`);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`⚠️ Job ${jobId} has stalled and will be reprocessed`);
  });

  worker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  // ==================== QUEUE EVENTS ====================
  /**
   * QueueEvents lắng nghe các event của queue từ Redis
   * Phù hợp cho monitoring và logging
   */
  const queueEvents = new QueueEvents('reelProcessingQueue', {
    connection: connectionEvents,
  });

  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    logger.debug(`✅ QueueEvents: Job ${jobId} completed`, {
      returnvalue: returnvalue?.substring?.(0, 100), // Log first 100 chars
    });
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(`❌ QueueEvents: Job ${jobId} failed: ${failedReason}`);
  });

  queueEvents.on('progress', ({ jobId, data }) => {
    logger.debug(`📊 QueueEvents: Job ${jobId} progress:`, data);
  });

  queueEvents.on('stalled', ({ jobId }) => {
    logger.warn(`⚠️ QueueEvents: Job ${jobId} stalled`);
  });

  queueEvents.on('waiting', ({ jobId }) => {
    logger.debug(`⏳ QueueEvents: Job ${jobId} is waiting`);
  });

  // Graceful shutdown
  const cleanup = async () => {
    logger.info('🛑 Shutting down Reel Worker...');
    await worker.close();
    await queueEvents.close();
    logger.info('✅ Reel Worker closed gracefully');
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  return { worker, queueEvents };
};

// ==================== QUEUE UTILITIES ====================

/**
 * Add job với priority và delay
 * @param {Object} jobData - Job data
 * @param {Object} options - Job options (priority, delay, etc.)
 */
export const addReelProcessingJob = async (jobData, options = {}) => {
  try {
    const job = await reelQueue.add('processReel', jobData, {
      priority: options.priority || 1, // Cao hơn = quan trọng hơn
      delay: options.delay || 0, // ms delay trước khi process
      jobId: options.jobId, // Custom job ID nếu cần
      ...options,
    });

    logger.info(`➕ Added job ${job.id} to queue`, {
      reelId: jobData.reelId,
      priority: job.opts.priority,
    });

    return job;
  } catch (error) {
    logger.error('Failed to add job to queue:', error);
    throw error;
  }
};

/**
 * Get queue metrics cho monitoring
 */
export const getQueueMetrics = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      reelQueue.getWaitingCount(),
      reelQueue.getActiveCount(),
      reelQueue.getCompletedCount(),
      reelQueue.getFailedCount(),
      reelQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get queue metrics:', error);
    return null;
  }
};

/**
 * Clean old jobs để tránh memory leak
 */
export const cleanQueue = async (grace = 24 * 3600 * 1000) => {
  try {
    const jobs = await reelQueue.clean(grace, 1000, 'completed');
    const failedJobs = await reelQueue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');
    
    logger.info(`🧹 Cleaned ${jobs.length} completed and ${failedJobs.length} failed jobs`);
    return { completed: jobs.length, failed: failedJobs.length };
  } catch (error) {
    logger.error('Failed to clean queue:', error);
    return null;
  }
};

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = async () => {
  logger.info('🛑 Shutting down Queue system...');
  
  try {
    await reelQueue.close();
    
    await connectionQueue.quit();
    await connectionWorker.quit();
    await connectionEvents.quit();
    
    logger.info('✅ Queue system closed gracefully');
  } catch (error) {
    logger.error('Error during queue shutdown:', error);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default connectionQueue;