import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || '';

const redisOptions = redisUrl
  ? redisUrl
  : {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : 0,
      maxRetriesPerRequest: null // Cho Socket.IO vA� BullMQ ho��t ����ng m��c tr���n
    };

export const redis = new Redis(redisOptions);
export const redisSubscriber = new Redis(redisOptions);
export const redisPublisher = new Redis(redisOptions);

redis.on('error', (error) => {
  console.error('[Redis] L��i k���t n��i:', error.message);
});

redis.on('ready', () => {
  console.log('[Redis] Sẵn sàng kết nối');
});

export default redis;
