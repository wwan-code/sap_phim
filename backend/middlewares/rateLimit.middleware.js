import rateLimit from 'express-rate-limit';

export const createRateLimiter = (options = {}) => rateLimit({
  windowMs: options.windowMs ?? 60 * 1000,
  max: options.max ?? 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: options.message ?? 'Bạn thực hiện quá nhiều yêu cầu, vui lòng thử lại sau.',
});

export const uploadLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
export const likeLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120 });
export const commentLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60 });
export const viewLimiter = createRateLimiter({ windowMs: 30 * 1000, max: 200 });

export default createRateLimiter;

