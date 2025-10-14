import { createClient } from 'redis';

const redisConfig = {
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('Redis: Too many reconnection attempts, giving up');
                return new Error('Too many reconnection attempts');
            }
            // Exponential backoff: 50ms, 100ms, 200ms, 400ms, ...
            const delay = Math.min(retries * 50, 3000);
            console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
        },
        connectTimeout: 10000,
    },
    // Enable automatic pipelining for better performance
    commandsQueueMaxLength: 1000,
    enableAutoPipelining: true,
};

const redisClient = createClient(redisConfig);

// Connection event handlers
redisClient.on('connect', () => {
    console.log('✅ Redis connected');
});

redisClient.on('ready', () => {
    console.log('✅ Redis ready to accept commands');
});

redisClient.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
    // Don't crash the app on Redis errors
});

redisClient.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
});

redisClient.on('end', () => {
    console.log('⚠️ Redis connection ended');
});

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        // App can still run without Redis, but with degraded performance
    }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await redisClient.quit();
        console.log('Redis connection closed gracefully');
    } catch (error) {
        console.error('Error closing Redis connection:', error);
    }
});

// Helper functions với error handling
export const redisHelpers = {
    /**
     * Get với fallback
     */
    async safeGet(key, fallback = null) {
        try {
            if (redisClient.status !== 'ready') return fallback;
            const value = await redisClient.get(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.error(`Redis GET error for key ${key}:`, error);
            return fallback;
        }
    },

    /**
     * Set với TTL
     */
    async safeSet(key, value, ttl = null) {
        try {
            if (redisClient.status !== 'ready') return false;
            const serialized = JSON.stringify(value);
            if (ttl) {
                await redisClient.setEx(key, ttl, serialized);
            } else {
                await redisClient.set(key, serialized);
            }
            return true;
        } catch (error) {
            console.error(`Redis SET error for key ${key}:`, error);
            return false;
        }
    },

    /**
     * Delete keys
     */
    async safeDel(...keys) {
        try {
            if (redisClient.status !== 'ready') return 0;
            return await redisClient.del(keys);
        } catch (error) {
            console.error(`Redis DEL error for keys ${keys}:`, error);
            return 0;
        }
    },

    /**
     * Increment counter
     */
    async safeIncr(key, ttl = null) {
        try {
            if (redisClient.status !== 'ready') return 0;
            const count = await redisClient.incr(key);
            if (ttl && count === 1) {
                await redisClient.expire(key, ttl);
            }
            return count;
        } catch (error) {
            console.error(`Redis INCR error for key ${key}:`, error);
            return 0;
        }
    },

    /**
     * Add to Set
     */
    async safeAddToSet(key, ...members) {
        try {
            if (redisClient.status !== 'ready') return 0;
            return await redisClient.sAdd(key, members);
        } catch (error) {
            console.error(`Redis SADD error for key ${key}:`, error);
            return 0;
        }
    },

    /**
     * Remove from Set
     */
    async safeRemoveFromSet(key, ...members) {
        try {
            if (redisClient.status !== 'ready') return 0;
            return await redisClient.sRem(key, members);
        } catch (error) {
            console.error(`Redis SREM error for key ${key}:`, error);
            return 0;
        }
    },

    /**
     * Get Set members
     */
    async safeGetSetMembers(key) {
        try {
            if (redisClient.status !== 'ready') return [];
            return await redisClient.sMembers(key);
        } catch (error) {
            console.error(`Redis SMEMBERS error for key ${key}:`, error);
            return [];
        }
    },

    /**
     * Cache with automatic serialization
     */
    async cache(key, fetchFn, ttl = 300) {
        try {
            // Try to get from cache
            const cached = await this.safeGet(key);
            if (cached !== null) return cached;

            // If not in cache, fetch and store
            const data = await fetchFn();
            await this.safeSet(key, data, ttl);
            return data;
        } catch (error) {
            console.error(`Cache error for key ${key}:`, error);
            return await fetchFn(); // Fallback to direct fetch
        }
    },

    /**
     * Invalidate cache pattern
     */
    async invalidatePattern(pattern) {
        try {
            if (redisClient.status !== 'ready') return 0;
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                return await redisClient.del(keys);
            }
            return 0;
        } catch (error) {
            console.error(`Redis pattern invalidation error for ${pattern}:`, error);
            return 0;
        }
    },

    /**
     * Get keys by pattern without deleting
     */
    async getKeysByPattern(pattern) {
        try {
            if (redisClient.status !== 'ready') return [];
            return await redisClient.keys(pattern);
        } catch (error) {
            console.error(`Redis KEYS error for pattern ${pattern}:`, error);
            return [];
        }
    },

    /**
     * Pub/Sub publish
     */
    async publish(channel, message) {
        try {
            if (redisClient.status !== 'ready') return 0;
            const payload = typeof message === 'string' ? message : JSON.stringify(message);
            return await redisClient.publish(channel, payload);
        } catch (error) {
            console.error(`Redis PUBLISH error for channel ${channel}:`, error);
            return 0;
        }
    },
};

export default redisClient;