import { Queue, QueueEvents, QueueScheduler } from 'bullmq';
import { redis } from './redis.js';

const connection = redis.duplicate();

export const REEL_QUEUE_NAME = 'reel-processing';

export const reelQueue = new Queue(REEL_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

export const reelQueueEvents = new QueueEvents(REEL_QUEUE_NAME, { connection });
export const reelQueueScheduler = new QueueScheduler(REEL_QUEUE_NAME, { connection });

reelQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[BullMQ] Job ${jobId} thất bại: ${failedReason}`);
});

reelQueueEvents.on('completed', ({ jobId }) => {
  console.log(`[BullMQ] Job ${jobId} đã xử lý xong`);
});

export default reelQueue;
