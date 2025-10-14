import express from 'express';
import cors from 'cors';
import session from "express-session";
import connectSessionSequelize from 'connect-session-sequelize';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

import sequelize from './config/database.js';
import { initSocket } from './config/socket.js';
import { errorHandler } from './middlewares/error.middleware.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import friendRoutes from './routes/friend.routes.js';
import genreRoutes from './routes/genre.routes.js';
import countryRoutes from './routes/country.routes.js';
import categoryRoutes from './routes/category.routes.js';
import movieRoutes from './routes/movie.routes.js';
import episodeRoutes from './routes/episode.routes.js';
import seriesRoutes from './routes/series.routes.js';
import sectionRoutes from './routes/section.routes.js';
import aiRoutes from './routes/ai.routes.js';
import watchHistoryRoutes from './routes/watchHistory.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import commentRoutes from './routes/comment.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import messageRoutes from './routes/message.routes.js';
import settingRoutes from './routes/setting.routes.js';
import reelRoutes from './routes/reel.routes.js';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== CORS CONFIGURATION ====================
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ==================== SECURITY & MIDDLEWARE ====================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable for development
  })
);

// Morgan logging với format tùy chỉnh
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== RATE LIMITING ====================
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 250, // 250 requests per window
  message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 10 phút.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain routes
  skip: (req) => {
    return req.path.startsWith('/api/reels/') && req.method === 'GET';
  },
});

app.use('/api/', limiter);

// ==================== SESSION CONFIGURATION ====================
const SequelizeStore = connectSessionSequelize(session.Store);
const sessionStore = new SequelizeStore({ db: sequelize });

app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false, // Changed to false for better performance
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
  name: 'sessionId', // Custom session name
}));

// ==================== STATIC FILES ====================
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', // Cache static files for 1 day
  etag: true,
}));

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the WWAN application.',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api/docs',
    },
  });
});

// ==================== API ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', movieRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/watch-history', watchHistoryRoutes);
app.use('/api', favoriteRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api', episodeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/reels', reelRoutes);

// ==================== 404 HANDLER ====================
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path,
  });
});

// ==================== ERROR HANDLER ====================
app.use(errorHandler);

// ==================== HTTP SERVER ====================
const httpServer = createServer(app);

// ==================== SOCKET.IO INITIALIZATION ====================
const io = initSocket(httpServer);

// ==================== WORKER & CRON INITIALIZATION ====================
let reelMaintenanceTasks = null;

const initializeBackgroundServices = async () => {
  try {
    // Initialize BullMQ Worker
    logger.info('🔄 Initializing Reel Processing Worker...');
    await import('./jobs/reelProcessor.job.js');
    logger.info('✅ Reel Worker initialized');

    // Initialize Cron Tasks (only in production or if explicitly enabled)
    if (process.env.ENABLE_CRON_TASKS === 'true' || process.env.NODE_ENV === 'production') {
      logger.info('🔄 Initializing Cron Tasks...');
      const cronModule = await import('./jobs/reelMaintenance.cron.js');
      reelMaintenanceTasks = cronModule.default;
      reelMaintenanceTasks.startAllTasks();
      logger.info('✅ Cron Tasks initialized');
    } else {
      logger.info('⏸️  Cron Tasks disabled (set ENABLE_CRON_TASKS=true to enable)');
    }
  } catch (err) {
    logger.error('❌ Failed to initialize background services:', err);
  }
};

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');

    // Sync session store
    await sessionStore.sync();
    logger.info('✅ Session store synchronized');

    // Start HTTP server
    httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on ${HOST}:${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 Access URLs:`);
      logger.info(`   Local:    http://localhost:${PORT}`);
      if (HOST === '0.0.0.0') {
        logger.info(`   Network:  http://192.168.1.133:${PORT}`);
      }

      // Initialize background services after server starts
      initializeBackgroundServices();
    });

    // ==================== MONITORING ====================
    // Log memory usage every 30 minutes
    setInterval(() => {
      const used = process.memoryUsage();
      logger.info('📊 Memory Usage:', {
        rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(used.external / 1024 / 1024)} MB`,
      });
    }, 30 * 60 * 1000);

  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = async (signal) => {
  logger.info(`\n🛑 ${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info('✅ HTTP server closed');

    try {
      // Stop cron tasks
      if (reelMaintenanceTasks) {
        logger.info('🛑 Stopping cron tasks...');
        reelMaintenanceTasks.stopAllTasks();
      }

      // Close Socket.IO
      if (io) {
        logger.info('🛑 Closing Socket.IO connections...');
        io.close();
      }

      // Close database connection
      logger.info('🛑 Closing database connection...');
      await sequelize.close();

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('⏱️  Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000);
};

// ==================== SIGNAL HANDLERS ====================
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection in production
  if (process.env.NODE_ENV !== 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// ==================== START SERVER ====================
startServer();

export default app;